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
    const userRef = db.doc('users/'+ userId)
    const userData = await userRef.get().then(r => r.data())
    let address = ""
    let referenceId = ""
    
    if(!userData.payment_link){
      const resWallet = await cryptoapis.createWalletAddress();
      address = resWallet.data.item.address;

      const resCallback: any = await cryptoapis.createCallbackConfirmation(
        userId,
        address
      );

      referenceId = resCallback.data.item.referenceId
    }else{
      address = userData.payment_link.address
      referenceId = userData.payment_link.refereceId
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
      expires_at: dayjs().add(15, "minutes").toDate()
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

export const onConfirmedTransaction = onRequest(async (request, response) => {
  logger.log(request.body);

  if (request.method == "POST") {
    if (
      request.body.data.event == "ADDRESS_COINS_TRANSACTION_CONFIRMED" &&
      request.body.data.item.network == "mainnet" &&
      request.body.data.item.direction == "incoming" &&
      request.body.data.item.unit == "BTC" &&
      request.body.daat.item.address == cryptoapis.walletAddress
    ) {
      const snap = await db
        .collection("users")
        .where("payment_link.referenceId", "==", request.body.referenceId)
        .get();

      if (snap.size > 0) {
        const doc = snap.docs[0];
        const data = doc.data();

        // data.payment_link.amount == request.body.data.item.amount

        await cryptoapis.removeCallbackConfirmation(request.body.refereceId);
        await db.collection(`users/${doc.id}/transactions`).add({
          ...request.body,
          created_at: new Date(),
        });

        if (data.sponsor_id) {
          try {
            await increaseBinaryPoints(doc.id);
          } catch (e) {
            logger.info("no se repartio el bono binario", e);
          }
        }

        if (data.sponsor_id && !data.subscription) {
          try {
            await execUserDirectBond(data.sponsor_id);
          } catch (e) {
            logger.info("no se repartio el bono directo", e);
          }
        }

        await doc.ref.set(
          {
            payment_link: {},
            subscription: "pro",
            subscription_status: "paid",
            subscription_expires_at: dayjs().add(28, "days").toDate(),
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
      response.status(200).send(true);
    }
  }
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