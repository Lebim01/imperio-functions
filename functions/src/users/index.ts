import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { v4 as uuidv4 } from "uuid";
import _ = require("lodash");
import { onRequest } from "firebase-functions/v2/https";

const db = getFirestore();

exports.onCreateUser = functions.firestore
  .document("users/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      // const data = snapshot.data();
      const newData = {
        created_at: new Date(),
        updated_at: new Date(),
        left: uuidv4(),
        right: uuidv4(),
        balance: 0,
        balance_shard: 0,
        left_points: 0,
        right_points: 0
      };
      try {
        await db.collection("users").doc(documentId).update(newData);
      } catch (e) {
        logger.info("no se crearon los campos", e);
      }
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });

exports.onUpdateUser = functions.firestore
  .document("users/{documentId}")
  .onUpdate(async (snapshot, context) => {
    const excludeFields = (obj: any) => {
      const { updated_at, ...rest } = obj;
      return rest;
    };
    try {
      const documentId = context.params.documentId;
      const beforeData = excludeFields(snapshot.before.data());
      const afterData = excludeFields(snapshot.after.data());
      if (_.isEqual(beforeData, afterData)) {
        return;
      }
      const newUpdateDate = {
        updated_at: new Date(),
      };
      try {
        await db.collection("users").doc(documentId).update(newUpdateDate);
      } catch (e) {
        logger.info("no se crearon los campos", e);
      }
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });

function incrementCounter(docRef: any, field: string, numShards: number) {
  const shardId = Math.floor(Math.random() * numShards);
  const shardRef = docRef.collection('shards').doc(shardId.toString());
  return shardRef.set({[field]: FieldValue.increment(1)}, {merge: true});
}

exports.execUserDirectBond = onRequest(async (request, response) => {
  if(request.method == "POST"){
    const sponsorRef = await db.doc('users/' + request.body.sponsorId)
    const sponsor = await sponsorRef.get().then(r => r.data())

    // primer nivel
    if(sponsor) {
      await incrementCounter(sponsorRef, "balance_shard", 50)
    }

    // segundo nivel
    if(sponsor && sponsor.sponsor_id){
      const sponsor2Ref = await db.doc('users/' + sponsor.sponsor_id).get()
      await incrementCounter(sponsor2Ref, "balance_shard", 10)
    }

    response.send("ok")
  }
})