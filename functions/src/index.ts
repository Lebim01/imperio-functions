import { onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import * as cryptoapis from "./cryptoapis";

initializeApp();

setGlobalOptions({ maxInstances: 10, timeoutSeconds: 540 });

export const getFees = onRequest(async (request, response) => {
  const res: any = await cryptoapis.getBitcoinFees();
  logger.info("fees", res);
  response.send(res.data.item);
});

exports.courses = require("./courses/index");
exports.lessons = require("./lessons/index");
exports.categories = require("./categories/index");
exports.users = require("./users/index");
exports.points = require("./points/index");
