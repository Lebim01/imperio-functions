import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import moment = require("moment-timezone");
import { getFirestore } from "firebase-admin/firestore";
//import { v4 } from 'uuid';

const db = getFirestore();

exports.onCreateLesson = functions.firestore
  .document("courses/{courseId}/lessons/{lessonId}")
  .onCreate(async (snapshot, context) => {
    try {
      const courseId = context.params.courseId;
      const lessonId = context.params.lessonId;
      //const data = snapshot.data();
      const newData = {
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        count_likes: 0,
        count_views: 0,
      };
      try {
        await db
          .collection("courses")
          .doc(courseId)
          .collection("lessons")
          .doc(lessonId)
          .update(newData);
      } catch (e) {
        functions.logger.log("no se crearon los campos", e);
      }

      function countLesson() {
        try {
          const docRef = db.collection("courses").doc(courseId);
          docRef.get().then((d) => {
            if (d.exists) {
              const data = d.data();
              let lesson = data?.count_lesson;
              lesson++;
              try {
                db.collection("courses").doc(courseId).update({
                  count_lesson: lesson,
                });
              } catch (e) {
                logger.info("fallo al actualizar el contador", e);
              }
            } else {
              logger.info("no se encuentra");
            }
          });
        } catch (e) {
          functions.logger.log("fallo al obtener los datos", e);
        }
      }

      countLesson();
    } catch (e) {
      functions.logger.log("No se asignaron los datos", e);
    }
  });

exports.onUpdateLesson = functions.firestore
  .document("courses/{courseId}/lessons/{lessonId}")
  .onUpdate(async (snapshot, context) => {
    try {
      const courseId = context.params.courseId;
      const lessonId = context.params.lessonId;
      //const data = snapshot.after.data();
      const newUpdateDate = {
        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
      };
      try {
        await db
          .collection("courses")
          .doc(courseId)
          .collection("lessons")
          .doc(lessonId)
          .update(newUpdateDate);
      } catch (e) {
        functions.logger.log("no se crearon los campos", e);
      }
    } catch (e) {
      functions.logger.log("No se asignaron los datos", e);
    }
  });
