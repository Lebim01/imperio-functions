import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import moment = require("moment-timezone");
import { getFirestore } from "firebase-admin/firestore";
//import { v4 } from 'uuid';

const db = getFirestore()

exports.onCreateCategory = functions.firestore.document('categories/{documentId}').onCreate(async (snapshot, context) => {
    try {
        const documentId = context.params.documentId;
       // const data = snapshot.data();
        const newData = {
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            count_courses: 0,
            highlight: 0,
            count_views: 0,
        }
        try {
            await db.collection('categories').doc(documentId).update(newData);
        } catch (e) {
            logger.info("no se crearon los campos", e)
        }

       

    } catch (e) {
        logger.info("No se asignaron los datos", e)
    }
})

exports.onUpdateCategory = functions.firestore.document('categories/{documentId}').onUpdate(async (snapshot, context) => {
    try {
        const documentId = context.params.documentId;
       // const data = snapshot.after.data();
        const newUpdateDate = {       
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        }
        try {
            await db.collection('categories').doc(documentId).update(newUpdateDate);
        } catch (e) {
            logger.info("no se crearon los campos", e)
        }
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });
