import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import { v4 as uuidv4 } from "uuid";
import * as _ from "lodash";
import { FieldValue, Filter, getFirestore } from "firebase-admin/firestore";
import dayjs = require("dayjs");
import axios from "axios";

const db = getFirestore();

const isStarter = (user) => {
  const expires_at = user.get("subscription.starter.expires_at");
  const is_admin =
    Boolean(user.get("is_admin")) || user.get("type") == "top-lider";
  return is_admin
    ? true
    : expires_at
    ? dayjs(expires_at.seconds * 1000).isAfter(dayjs())
    : false;
};

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
        profits: 0,
        is_new: true, // flag nuevo usuario (cambia a false cuando se activa su paquete)
        has_scholarship: false,
        is_pending_complete_personal_info: true,
        rank: "vanguard",

        subscription: {
          pro: {
            expires_at: null,
            start_at: null,
            status: null,
          },
          supreme: {
            expires_at: null,
            start_at: null,
            status: null,
          },
          ibo: {
            expires_at: null,
            start_at: null,
            status: null,
          },
        },

        // CONTADORES
        count_direct_people: 0,
        count_underline_people: 0,
        count_scholarship_people: 0,
        count_direct_people_this_cycle: 0,

        // BINARIOS
        left_points: 0,
        right_points: 0,
        left_binary_user_id: null,
        right_binary_user_id: null,
        parent_binary_user_id: null,

        // BONOS
        bond_direct: 0,
        bond_direct_second_level: 0,
        bond_residual_level_1: 0,
        bond_residual_level_2: 0,
        bond_supreme_level_1: 0,
        bond_supreme_level_2: 0,
        bond_supreme_level_3: 0,
        bond_scholarship_level_1: 0,
        bond_scholarship_level_2: 0,
        bond_scholarship_level_3: 0,
      };

      /**
       * Esto activa la posicion del binario
       * Solo para cuentas registradas por el admin, estas cuentas no pagan
       */
      if (data.action == "calc_binary") {
        const binaryPosition = await calculatePositionOfBinary(
          data.sponsor_id,
          data.position
        );
        newData.parent_binary_user_id = binaryPosition.parent_id;
        newData.action = null;

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

        /**
         * se supone deberia actualizar el contador de usuarios que estan en la red
         */
        await increaseUnderlinePeople(documentId);
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

      if (isStarter(snapshot.after)) {
        const profits = Number(snapshot.after.get("profits"));
        if (profits >= 177) {
          axios.post(
            "https://topx-academy-nest.vercel.app/subscriptions/starterActivatePro",
            {
              user_id: snapshot.after.id,
            }
          );
        }
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
};
