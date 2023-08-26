import functions = require("firebase-functions");
import { getFirestore } from "firebase-admin/firestore";
import dayjs = require("dayjs");

const db = getFirestore();

const getLeftPoints = async (userId) => {
  let recalculate = 0;
  const docRef = await db
    .collection("users")
    .doc(userId)
    .collection("left-points")
    .get();
  docRef.forEach((d) => {
    recalculate += d.data().points;
  });
  return recalculate;
};

const getRightPoints = async (userId) => {
  let recalculate = 0;
  const docRef = await db
    .collection("users")
    .doc(userId)
    .collection("right-points")
    .get();
  docRef.forEach((d) => {
    recalculate += d.data().points;
  });
  return recalculate;
};

//funcion que detecta cuando se generan puntos a la izquierda con fecha de expiracion
exports.onCreateLeftPoints = functions.firestore
  .document("users/{userId}/left-points/{sideId}")
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const sideId = context.params.sideId;
    const addDefaultFields = async () => {
      const newData = {
        starts_at: new Date(),
        expires_at: dayjs(new Date()).add(84, "day").toDate(),
      };
      try {
        await db
          .collection("users")
          .doc(userId)
          .collection("left-points")
          .doc(sideId)
          .update(newData);
      } catch (e) {
        functions.logger.log("fallo al agregar los datos default", e);
      }
    };
    const updateBinary = async () => {
      await addDefaultFields();

      try {
        const left_points = await getLeftPoints(userId);
        await db.collection("users").doc(userId).update({
          left_points,
        });
      } catch (e) {
        functions.logger.log("fallo al actualizar los puntos", e);
      }
    };

    await updateBinary();
  });

exports.onDeleteLeftPoints = functions.firestore
  .document("users/{userId}/left-points/{sideId}")
  .onDelete(async (snapshot, context) => {
    const userId = context.params.userId;
    try {
      const left_points = await getLeftPoints(userId);
      await db.collection("users").doc(userId).update({
        left_points,
      });
    } catch (e) {
      functions.logger.log("fallo al actualizar los puntos", e);
    }
  });

exports.onCreateRightPoints = functions.firestore
  .document("users/{userId}/right-points/{sideId}")
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const sideId = context.params.sideId;
    const addDefaultFields = async () => {
      const newData = {
        starts_at: new Date(),
        expires_at: dayjs(new Date()).add(84, "day").toDate(),
      };
      try {
        await db
          .collection("users")
          .doc(userId)
          .collection("right-points")
          .doc(sideId)
          .update(newData);
      } catch (e) {
        functions.logger.log("fallo al agregar los datos default", e);
      }
    };
    const updateBinary = async () => {
      await addDefaultFields();
      try {
        const right_points = await getRightPoints(userId);
        await db.collection("users").doc(userId).update({
          right_points,
        });
      } catch (e) {
        functions.logger.log("fallo al actualizar los puntos", e);
      }
    };

    await updateBinary();
  });

exports.onDeleteRightPoints = functions.firestore
  .document("users/{userId}/right-points/{sideId}")
  .onDelete(async (snapshot, context) => {
    const userId = context.params.userId;
    try {
      const right_points = await getRightPoints(userId);
      await db.collection("users").doc(userId).update({
        right_points,
      });
    } catch (e) {
      functions.logger.log("fallo al actualizar los puntos", e);
    }
  });
