import * as logger from "firebase-functions/logger";
import functions = require("firebase-functions");
import { getFirestore } from "firebase-admin/firestore";
import { v4 as uuidv4 } from 'uuid';
import _ = require("lodash");


const db = getFirestore()

exports.onCreateUser = functions.firestore.document('users/{documentId}').onCreate(async (snapshot, context) => {
    try {
        const documentId = context.params.documentId;
       // const data = snapshot.data();
        const newData = {
            created_at: new Date(),
            updated_at: new Date(),
            left: uuidv4(),
            right: uuidv4(),
            balance: 0,
            status: "in_progress",
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
    const excludeFields = (obj: any) => {
        const { updated_at, ...rest } = obj
        return rest
      }
    try {
        const documentId = context.params.documentId;
        const beforeData = excludeFields(snapshot.before.data());
        const afterData = excludeFields(snapshot.after.data());
        if(_.isEqual(beforeData, afterData)){
            return;
          }
        const newUpdateDate = {       
            updated_at: new Date(),
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
