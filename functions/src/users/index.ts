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
        bond_direct: 0,
        bond_matching: 0,
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

exports.onUpdateContryUser = functions.firestore
  .document("users/{documentId}")
  .onWrite(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      const beforeCountry = snapshot.before.get("country");
      const afterCountry = snapshot.after.get("country");

      if (beforeCountry == afterCountry) {
        return;
      }

      // update country
      const left_docs = await db
        .collectionGroup("left-people")
        .where("user_id", "==", documentId)
        .get()
        .then((r) => r.docs);
      const right_docs = await db
        .collectionGroup("right-people")
        .where("user_id", "==", documentId)
        .get()
        .then((r) => r.docs);

      const batch = db.batch();
      for (const l of left_docs) {
        batch.update(l.ref, {
          country: afterCountry,
        });
      }
      for (const l of right_docs) {
        batch.update(l.ref, {
          country: afterCountry,
        });
      }
      await batch.commit();
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });
