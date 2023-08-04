import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const db = getFirestore();

export const calculatePositionOfBinary = async (
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

export const execUserBinaryBond = async (userId: string): Promise<number> => {
  return 0;
};

export const execPaymentRoll = async (userId: string) => {
  const userRef = db.doc("users/" + userId);
  const user = await userRef.get().then((r) => r.data());

  const binaryBond = await execUserBinaryBond(userId);
  const balance = user.balance || 0;

  logger.log("Pagar" + binaryBond + balance);
};