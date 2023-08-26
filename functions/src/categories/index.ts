import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { getFirestore } from "firebase-admin/firestore";
import _ = require("lodash");
//import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

exports.onCreateCategory = functions.firestore
  .document("categories/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      // const data = snapshot.data();
      const newData = {
        created_at: new Date(),
        updated_at: new Date(),
        count_courses: 0,
        highlight: 0,
        count_views: 0,
      };
      try {
        await db.collection("categories").doc(documentId).update(newData);
      } catch (e) {
        logger.info("no se crearon los campos", e);
      }
    } catch (e) {
      logger.info("No se asignaron los datoss", e);
    }
  });

exports.onUpdateCategory = functions.firestore
  .document("categories/{documentId}")
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
        await db.collection("categories").doc(documentId).update(newUpdateDate);
      } catch (e) {
        logger.info("no se crearon los campos", e);
      }
    } catch (e) {
      logger.info("No se asignaron los datoss", e);
    }
  });
