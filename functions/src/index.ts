import { setGlobalOptions } from "firebase-functions/v2";
import { initializeApp } from "firebase-admin/app";

initializeApp();

setGlobalOptions({ maxInstances: 10, timeoutSeconds: 540 });

exports.courses = require("./courses/index");
exports.lessons = require("./lessons/index");
exports.categories = require("./categories/index");
exports.users = require("./users/index");
