import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { v4 as uuidv4 } from "uuid";
import _ = require("lodash");
import { onRequest } from "firebase-functions/v2/https";
import { execUserDirectBond } from "../utils/Functions";
import { getFirestore } from "firebase-admin/firestore";
import { Counter } from "../utils/Counter";

const db = getFirestore()

exports.onCreateUser = functions.firestore
  .document("users/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      const data = snapshot.data();
      const newData = {
        created_at: new Date(),
        updated_at: new Date(),
        left: uuidv4(),
        right: uuidv4(),
        balance: 0,
        left_points: 0,
        right_points: 0
      };

      if(data.sponsor_id && data.position){
        const counter = new Counter(db.doc('users/' + data.sponsor_id), data.position + "_points")
        await counter.incrementBy(100)
      }

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

exports.execUserDirectBond = onRequest(async (request, response) => {
  if(request.method == "POST"){
    await execUserDirectBond(request.body.sponsorId)
    response.send("ok")
  }
})