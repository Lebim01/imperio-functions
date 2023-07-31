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

const db = getFirestore();

export const getBalance = onRequest(async (request, response) => {
  const res = await cryptoapis.getAddressBalance();
  logger.info("Response", JSON.stringify(res));
  response.send(res);
});

export const getListDepositAddress = onRequest(async (request, response) => {
  const res = await cryptoapis.getListDepositAddress();
  logger.info("Response", JSON.stringify(res));
  response.send(res);
});

export const createAddress = onRequest(async (request, response) => {
  if (request.method == "POST") {
    const res = await cryptoapis.createWalletAddress();
    logger.info("Response", JSON.stringify(res));

    const resCallback = await cryptoapis.createCallbackConfirmation(
      request.body.userId,
      res.data.item.address
    );
    logger.info("Response", JSON.stringify(resCallback));

    await db.doc(`users/${request.body.userId}`).set(
      {
        payment_link: {
          address: res.data.item.address,
          qr: `https://chart.googleapis.com/chart?chs=150x150&amp;cht=qr&amp;chl=${res.data.item.address};choe=UTF-8`,
          status: "pending",
          created_at: new Date(),
        },
      },
      {
        merge: true,
      }
    );
    response.send(res);
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
        const doc = snap.docs[0]
        await db.collection(`users/${doc.id}/transactions`).add(request.body)
      }
    }
  }
});
