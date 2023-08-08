import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, Filter, getFirestore } from "firebase-admin/firestore";
import * as cryptoapis from "./cryptoapis";
import * as dayjs from "dayjs";

initializeApp();

setGlobalOptions({ maxInstances: 10 });

const db = getFirestore();

/**
 * payload {
 *   userId: string
 * }
 */
export const createPaymentAddress = onRequest(async (request, response) => {
  if (request.method == "POST") {
    const userId = request.body.userId || "";
    const userRef = db.doc("users/" + userId);
    const userData = await userRef.get().then((r) => r.data());
    let address = "";
    let referenceId = "";

    if (!userData.payment_link) {
      const resWallet = await cryptoapis.createWalletAddress();
      logger.log(resWallet);
      address = resWallet.data.item.address;

      const resCallback: any = await cryptoapis.createCallbackConfirmation(
        userId,
        address
      );
      logger.log(resCallback);

      const resConfirmation: any =
        await cryptoapis.createCallbackFirstConfirmation(userId, address);
      logger.log(resConfirmation);

      referenceId = resCallback.data.item.referenceId;
    } else {
      address = userData.payment_link.address;
      referenceId = userData.payment_link.referenceId;
    }

    const amount: any = await cryptoapis.getBTCExchange(177);

    const payment_link = {
      referenceId,
      address,
      qr: `https://chart.googleapis.com/chart?chs=225x225&chld=L|2&cht=qr&chl=bitcoin:${address}?amount=${amount}`,
      status: "pending",
      created_at: new Date(),
      amount,
      currency: "BTC",
      expires_at: dayjs().add(15, "minutes").toDate(),
    };

    await db.doc(`users/${userId}`).update({
      payment_link,
    });

    response.send({
      address: address,
      amount: payment_link.amount,
      currency: payment_link.currency,
      qr: payment_link.qr,
    });
  }
});

export const onConfirmedCoins = onRequest(async (request, response) => {
  logger.log(request.body);

  if (request.method == "POST") {
    if (
      request.body.data.event == "ADDRESS_COINS_TRANSACTION_UNCONFIRMED" &&
      request.body.data.item.network == "mainnet" &&
      request.body.data.item.direction == "incoming" &&
      request.body.data.item.unit == "BTC"
    ) {
      const snap = await db
        .collection("users")
        .where("payment_link.address", "==", request.body.data.item.address)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        await doc.ref.update({
          payment_link: {
            ...data.payment_link,
            status: "confirming",
          },
        });

        response.status(200).send(true);
      } else {
        logger.log("Cantidad incorrecta");
        response.status(200).send(true);
      }
    } else {
      response.status(200).send(true);
    }
  }
});

export const onConfirmedTransaction = onRequest(async (request, response) => {
  logger.log(request.body);

  if (request.method == "POST") {
    if (
      request.body.data.event == "ADDRESS_COINS_TRANSACTION_CONFIRMED" &&
      request.body.data.item.network == "mainnet" &&
      request.body.data.item.direction == "incoming" &&
      request.body.data.item.unit == "BTC"
    ) {
      const snap = await db
        .collection("users")
        .where("payment_link.referenceId", "==", request.body.referenceId)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        if (data.payment_link.amount == request.body.data.item.amount) {
          const binaryPosition = await calculatePositionOfBinary(
            data.sponsor_id,
            data.position
          );
          
          /**
           * se setea el valor del usuario padre en el usuario que se registro
           */
          await doc.ref.update({
            parent_binary_user_id: binaryPosition.parent_id,
          });

          try {
            /**
             * se setea el valor del hijo al usuario ascendente en el binario
             */
            await db
              .collection("users")
              .doc(binaryPosition.parent_id)
              .update(
                data.position == "left"
                  ? { left_binary_user_id: doc.id }
                  : { right_binary_user_id: doc.id }
              );
          } catch (e) {
            logger.info("no se pudo actualizar el binario derrame", e);
          }

          /**
           * eliminar el evento que esta en el servicio de la wallet
           */
          await cryptoapis.removeCallbackConfirmation(request.body.refereceId);

          /**
           * guardar registro de la transaccion dentro de una subcoleccion
           */
          await db.collection(`users/${doc.id}/transactions`).add({
            ...request.body,
            created_at: new Date(),
          });

          /**
           * aumenta los puntos del binario hacia arriba
           */
          if (data.sponsor_id) {
            try {
              await increaseBinaryPoints(doc.id);
            } catch (e) {
              logger.info("no se repartio el bono binario", e);
            }
          }

          /**
           * aumentar puntos de bono directo 2 niveles
           */
          if (data.sponsor_id && !data.subscription) {
            try {
              await execUserDirectBond(data.sponsor_id);
            } catch (e) {
              logger.info("no se repartio el bono directo", e);
            }
          }

          /**
           * usuarios solo nuevos (primera vez) deberian tener 56 dias
           * usuarios segunda vez solo 28 dias
           * FIX
           */
          const transactions = await doc.ref.collection("transactions").get();
          const isNew = transactions.size == 0;

          await doc.ref.set(
            {
              payment_link: {},
              subscription: "pro",
              subscription_status: "paid",
              subscription_expires_at: dayjs()
                .add(isNew ? 56 : 28, "days")
                .toDate(),
            },
            {
              merge: true,
            }
          );

          response.status(200).send(true);
        } else {
          logger.error(
            "No se encontro el usuario para la transacción con referenceId: " +
              request.body.referenceId
          );
          response.status(400).send(false);
        }
      } else {
        logger.log("Cantidad incorrecta");
        response.status(200).send(true);
      }
    } else {
      response.status(200).send(true);
    }
  }
});

export const getFees = onRequest(async (request, response) => {
  const res: any = await cryptoapis.getBitcoinFees();
  logger.info("fees", res);
  response.send(res.data.item);
});

export const payroll = onRequest(async (request, response) => {
  const users = await db.collection("users").get();
  const docs = users.docs.map((r) => ({ id: r.id, ...r.data() }));

  const payroll_data = docs
    .map((docData: any) => {
      const binary_side =
        docData.left_points > docData.right_points ? "right" : "left";
      const binary_points = docData[`${binary_side}_points`];
      return {
        id: docData.id,
        name: docData.name,
        direct: docData.bond_direct || 0,
        binary: binary_points * 0.1,
        binary_side,
        binary_points,
        left_points: docData.left_points,
        right_points: docData.right_points,
        wallet_bitcoin: docData.wallet_bitcoin,
      };
    })
    .map((doc) => ({
      ...doc,
      subtotal: doc.direct + doc.binary,
      total: doc.direct + doc.binary - (doc.direct + doc.binary) * 0.05,
      fee: (doc.direct + doc.binary) * 0.05,
    }))
    .filter((doc) => doc.total >= 40)
    .filter((doc) => Boolean(doc.wallet_bitcoin));

  const payroll_data_2 = await Promise.all(
    payroll_data.map(async (doc) => ({
      ...doc,
      btc_amount: await cryptoapis.getBTCExchange(doc.total),
    }))
  );

  /*const ref = await db.collection("payroll").add({
    created_at: new Date()
  });
  await Promise.all(payroll_data_2.map((doc) => {
    return ref.collection("members").add(doc)
  }))*/

  for(const doc of payroll_data_2) {
    await db.doc('users/' + doc.id).update({
      bond_direct: 0,
      left_poins: doc.left_points - doc.binary_points,
      right_points: doc.right_points - doc.binary_points
    })
  }

  await cryptoapis.sendCoins(
    payroll_data_2.map((doc) => ({
      address: doc.wallet_bitcoin,
      amount: `${doc.btc_amount}`,
    }))
  );

  response.send(payroll_data_2);
});

export const onConfirmSendedCoins = onRequest(async (request, response) => {
  await db.collection("coins_sended_callbacks").add(request.body);
  response.send("ok");
});

exports.courses = require("./courses/index");
exports.lessons = require("./lessons/index");
exports.categories = require("./categories/index");
exports.users = require("./users/index");

const increaseBinaryPoints = async (registerUserId: string) => {
  const batch = db.batch();

  let currentUser = registerUserId;

  do {
    const users = await db
      .collection("users")
      .where(
        Filter.or(
          Filter.where("left_binary_user_id", "==", currentUser),
          Filter.where("right_binary_user_id", "==", currentUser)
        )
      )
      .get();
    if (users.size > 0) {
      const user = users.docs[0];
      const userData = user.data();
      const position =
        userData.left_binary_user_id == currentUser ? "left" : "right";

      currentUser = user.id;

      batch.set(
        user.ref,
        {
          ...(position == "left"
            ? {
                left_points: FieldValue.increment(100),
              }
            : {
                right_points: FieldValue.increment(100),
              }),

          count_underline_people: FieldValue.increment(1),
        },
        {
          merge: true,
        }
      );
    } else {
      currentUser = null;
    }
  } while (currentUser);

  // Commit the batch
  await batch.commit();
};

const execUserDirectBond = async (sponsorId: string) => {
  const sponsorRef = await db.doc("users/" + sponsorId);
  const sponsor = await sponsorRef.get().then((r) => r.data());

  // primer nivel
  if (sponsor) {
    await sponsorRef.set(
      {
        bond_direct: FieldValue.increment(
          sponsor && sponsor.sponsor_id ? 50 : 60
        ),
      },
      {
        merge: true,
      }
    );
  }

  // segundo nivel
  if (sponsor && sponsor.sponsor_id) {
    const sponsor2Ref = db.doc("users/" + sponsor.sponsor_id);
    await sponsor2Ref.set(
      {
        bond_direct: FieldValue.increment(10),
      },
      {
        merge: true,
      }
    );
  }
};

const calculatePositionOfBinary = async (
  sponsor_id: string,
  position: "left" | "right"
) => {
  let parent_id = null;

  let next_user_id = sponsor_id;
  do {
    const sponsorRef = db.doc("users/" + next_user_id);
    const sponsorData = await sponsorRef.get().then((r) => r.data());

    if (sponsorData[`${position}_binary_user_id`]) {
      next_user_id = sponsorData[`${position}_binary_user_id`];
    } else {
      parent_id = sponsorRef.id;
    }
  } while (!parent_id);

  return {
    parent_id,
  };
};
