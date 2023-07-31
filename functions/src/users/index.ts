import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import moment = require("moment-timezone");
import { getFirestore } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';


const db = getFirestore()

exports.onCreateUser = functions.firestore.document('users/{documentId}').onCreate(async (snapshot, context) => {
    try {
        const documentId = context.params.documentId;
       // const data = snapshot.data();
        const newData = {
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            left: uuidv4(),
            right: uuidv4(),
            balance: 0,
        }
        try {
            await db.collection('users').doc(documentId).update(newData);
            
        } catch (e) {
            logger.info("no se crearon los campos", e)
        }

       

    } catch (e) {
        logger.info("No se asignaron los datos", e)
    }
})

exports.onUpdateUser = functions.firestore.document('users/{documentId}').onUpdate(async (snapshot, context) => {
    try {
        const documentId = context.params.documentId;
       // const data = snapshot.after.data();
        const newUpdateDate = {       
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss'),
        }
        try {
            await db.collection('users').doc(documentId).update(newUpdateDate);
        } catch (e) {
            logger.info("no se crearon los campos", e)
        }
    } catch (e) {
      logger.info("No se asignaron los datos", e);
    }
  });
