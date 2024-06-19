import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import * as _ from "lodash";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

exports.onCreateUser = functions.firestore
  .document("users/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      const data = snapshot.data();

      const newData: any = {
        created_at: new Date(),
        updated_at: new Date(),
        profits: 0,
        is_new: true, // flag nuevo usuario (cambia a false cuando se activa su paquete)

        sponsor_id: data?.sponsor_id || null,
        membership: data?.membership || null,
        membership_started_at: data?.membership_started_at || null,
        membership_expires_at: data?.membership_expires_at || null,

        // CONTADORES
        count_direct_people: 0,

        // BONOS
        bond_direct_level_1: 0,
        bond_direct_level_2: 0,
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
