import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import { v4 as uuidv4 } from "uuid";
import * as _ from "lodash";
import { FieldValue, Filter, getFirestore } from "firebase-admin/firestore";

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
        left: uuidv4(),
        right: uuidv4(),
        balance: 0,
        left_points: 0,
        right_points: 0,
        count_underline_people: 0,
        left_binary_user_id: null,
        right_binary_user_id: null,
        parent_binary_user_id: null,
      };

      if (data.action == "calc_binary") {
        const binaryPosition = await calculatePositionOfBinary(
          data.sponsor_id,
          data.position
        );
        newData.parent_binary_user_id = binaryPosition.parent_id;
        newData.action = null

        try {
          await db
            .collection("users")
            .doc(binaryPosition.parent_id)
            .update({
              ...(data.position == "left"
                ? { left_binary_user_id: documentId }
                : { right_binary_user_id: documentId }),
            });
        } catch (e) {
          logger.info("no se pudo actualizar el binario derrame", e);
        }

        await increaseUnderlinePeople(documentId)
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

const calculatePositionOfBinary = async (
  sponsor_id: string,
  position: "left" | "right"
) => {
  let parent_id = null;

  let next_user_id = sponsor_id;
  do {
    const sponsorRef = db.doc("users/" + next_user_id);
    const sponsorData = await sponsorRef.get().then((r) => r.data());

    if (sponsorData[`${position}_binary_user_id`]) {
      next_user_id = sponsorData[`${position}_binary_user_id`];
    } else {
      parent_id = sponsorRef.id;
    }
  } while (!parent_id);

  return {
    parent_id,
  };
};

const increaseUnderlinePeople = async (registerUserId: string) => {
  const batch = db.batch();
  let currentUser = registerUserId;
  do {
    const users = await db
      .collection("users")
      .where(
        Filter.or(
          Filter.where("left_binary_user_id", "==", currentUser),
          Filter.where("right_binary_user_id", "==", currentUser)
        )
      )
      .get();
    if (users.size > 0) {
      const user = users.docs[0];
      //const userData = user.data();

      currentUser = user.id;

      batch.set(
        user.ref,
        {
          count_underline_people: FieldValue.increment(1),
        },
        {
          merge: true,
        }
      );
    } else {
      currentUser = null;
    }
  } while (currentUser);
}