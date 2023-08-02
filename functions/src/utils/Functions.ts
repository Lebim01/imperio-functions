import { getFirestore } from "firebase-admin/firestore";
import { Counter } from "./Counter"
import { logger } from "firebase-functions/v2";

const db = getFirestore();

export const execUserDirectBond = async (sponsorId: string) => {
    const sponsorRef = await db.doc('users/' + sponsorId)
    const sponsor = await sponsorRef.get().then(r => r.data())

    // primer nivel
    if(sponsor) {
      const counter = new Counter(sponsorRef, "balance")
      await counter.incrementBy(sponsor && sponsor.sponsor_id ? 50 : 60)
    }

    // segundo nivel
    if(sponsor && sponsor.sponsor_id){
      const sponsor2Ref = await db.doc('users/' + sponsor.sponsor_id).get()
      const counter = new Counter(sponsor2Ref, "balance")
      await counter.incrementBy(10)
    }
}

export const execUserBinaryBond = async (userId: string): Promise<number> => {
    return 0
}

export const execPaymentRoll = async (userId: string) => {
    const userRef = db.doc('users/' + userId)
    const user = await userRef.get().then(r => r.data())

    const binaryBond = await execUserBinaryBond(userId)
    const balance = user.balance || 0

    logger.log("Pagar" + binaryBond + balance)
}