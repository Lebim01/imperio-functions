import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { v4 as uuidv4 } from "uuid";
import _ = require("lodash");
import {
  calculatePositionOfBinary,
} from "../utils/Functions";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

exports.onCreateUser = functions.firestore
  .document("users/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      const data = snapshot.data();

      const binaryPosition = await calculatePositionOfBinary(
        data.sponsor_id,
        data.position
      );
      const newData = {
        created_at: new Date(),
        updated_at: new Date(),
        left: uuidv4(),
        right: uuidv4(),
        balance: 0,
        left_points: 0,
        right_points: 0,
        count_underline_people: 0,
        left_binary_user_id: null,
        right_binary_user_id: null,
        parent_binary_user_id: binaryPosition.parent_id,
      };

      try {
        await db
          .collection("users")
          .doc(binaryPosition.parent_id)
          .update(
            data.position == "left"
              ? { left_binary_user_id: documentId }
              : { right_binary_user_id: documentId }
          );
      } catch (e) {
        logger.info("no se pudo actualizar el binario derrame", e);
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
