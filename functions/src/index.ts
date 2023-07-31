/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getFirestore } from "firebase-admin/firestore";
import * as cryptoapis from "./cryptoapis";
import * as dayjs from "dayjs";

const db = getFirestore();

const MEMBERSHIP_PRICE = 177; //usd

export const createAddress = onRequest(async (request, response) => {
  if (request.method == "POST") {
    const res = await cryptoapis.createWalletAddress();
    logger.info("Response", JSON.stringify(res));

    const resCallback = await cryptoapis.createCallbackConfirmation(
      request.body.userId,
      res.data.item.address
    );
    logger.info("Response", JSON.stringify(resCallback));

    const exchange_rate: any = await cryptoapis.getExchangeRate("usd", "btc");
    const amount = exchange_rate.data.item.rate * MEMBERSHIP_PRICE;

    const payment_link = {
      address: res.data.item.address,
      qr: `https://chart.googleapis.com/chart?chs=150x150&amp;cht=qr&amp;chl=${res.data.item.address};choe=UTF-8`,
      status: "pending",
      created_at: new Date(),
      amount,
      currency: "btc",
      exchange_rate: exchange_rate.data.item,
    };

    await db.doc(`users/${request.body.userId}`).set(
      {
        payment_link,
      },
      {
        merge: true,
      }
    );
    response.send({
      address: payment_link.address,
      amount: payment_link.amount,
      currency: payment_link.currency,
      qr: payment_link.qr,
    });
  }
});

export const onConfirmedTransaction = onRequest(async (request, response) => {
  if (request.method == "POST") {
    if (request.body.data.event == "ADDRESS_COINS_TRANSACTION_CONFIRMED") {
      const snap = await db
        .collection("users")
        .where("payment_link.address", "==", request.body.data.item.address)
        .get();

      if (snap.docs[0]) {
        const doc = snap.docs[0];
        const data = doc.data();

        if (
          data.payment_link.amount == request.body.data.item.amount &&
          request.body.data.item.unit?.toUpperCase() == "BTC"
        ) {
          await db.collection(`users/${doc.id}/transactions`).add({
            ...request.body,
            created_at: new Date(),
          });
          await doc.ref.set(
            {
              payment_link: {},
              subscription_status: "paid",
              subscription_expires_at: dayjs().add(28, "days").toDate(),
            },
            {
              merge: true,
            }
          );
          response.status(200).send(true);
        } else {
          response.status(400).send(false);
        }
      } else {
        response.status(400).send(false);
      }
    } else {
      response.status(200).send(true);
    }
  }
});
