import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import moment = require("moment-timezone");
import { getFirestore } from "firebase-admin/firestore";
import _ = require("lodash");
//import { v4 } from 'uuid';

const db = getFirestore();

exports.onCreateCourse = functions.firestore
  .document("courses/{documentId}")
  .onCreate(async (snapshot, context) => {
    try {
      const documentId = context.params.documentId;
      const data = snapshot.data();
      const idCategory = data.id_category
      const newData = {
        created_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
        count_lesson: 0,
        count_likes: 0,
        count_views: 0,
        status: 'in_progress'
      };
      try {
        await db.collection("courses").doc(documentId).update(newData);
      } catch (e) {
        logger.info("no se crearon los campos", e);
      }
      async function countCourse(id: string) {
        const refCategory = await db.collection('categories').doc(id).get()
        let dataCategory;
        if (refCategory.data()) {
          dataCategory = refCategory?.data()?.count_courses
        }
        dataCategory++
        try {
          await db.collection('categories').doc(id).update({
            count_lesson: dataCategory,
          })
        } catch (e) {
          logger.info("error al actualizar el contador de categorias", e)
        }
      }
      await countCourse(idCategory)
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });

exports.onUpdateCourse = functions.firestore
  .document("courses/{documentId}")
  .onUpdate(async (snapshot, context) => {
    const excludeFields = (obj: any) => {
      const { updated_at, ...rest } = obj
      return rest
    }
    try {
      const courseId = context.params.documentId
      const beforeData = excludeFields(snapshot.before.data());
      const afterData = excludeFields(snapshot.after.data());

      if (_.isEqual(beforeData, afterData)) {
        return;
      }
      // const data = snapshot.after.data();
      const newUpdateDate = {
        updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
      }
      try {
        await db.collection('courses').doc(courseId).update(newUpdateDate);
      } catch (e) {
        logger.info("no se crearon los campos", e)
      }
    } catch (e) {
      logger.info("No se asignaron los datos", e)
    }
  })
