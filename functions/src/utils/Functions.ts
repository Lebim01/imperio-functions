import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

const db = getFirestore();



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