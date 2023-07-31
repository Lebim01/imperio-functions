import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { getFirestore } from "firebase-admin/firestore";
import _ = require("lodash");
//import { v4 as uuidv4 } from 'uuid';

const db = getFirestore();

exports.onCreateLesson = functions.firestore
  .document("courses/{courseId}/lessons/{lessonId}")
  .onCreate(async (snapshot, context) => {
    try {
      const courseId = context.params.courseId;
      const lessonId = context.params.lessonId;
      //const data = snapshot.data();
      const newData = {
        created_at: new Date(),
        updated_at: new Date(),
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
      functions.logger.log("No se asignaron los datoss", e);
    }
  });

exports.onUpdateLesson = functions.firestore
  .document("courses/{courseId}/lessons/{lessonId}")
  .onUpdate(async (snapshot, context) => {
    const excludeFields = (obj: any) => {
      const { updated_at, ...rest } = obj
      return rest
    }
    try {
      const courseId = context.params.courseId;
      const lessonId = context.params.lessonId;
      const beforeData = excludeFields(snapshot.before.data());
      const afterData = excludeFields(snapshot.after.data());

      if(_.isEqual(beforeData, afterData)){
        return;
      }

      const newUpdateDate = {
        updated_at: new Date(),
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
      functions.logger.log("No se asignaron los datoss", e);
    }
  });
