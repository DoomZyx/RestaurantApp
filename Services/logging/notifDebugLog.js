/**
 * Ecrit dans logs/notifications-debug.log pour tracer les evenements
 * sans dependre du terminal (utile si stdout est redirige ou buffere).
 */
import fs from "fs";
import path from "path";

const LOG_FILE = path.join(process.cwd(), "logs", "notifications-debug.log");

function line(msg) {
  const ts = new Date().toISOString();
  try {
    fs.appendFileSync(LOG_FILE, `${ts} ${msg}\n`);
  } catch (e) {
    try {
      fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
      fs.appendFileSync(LOG_FILE, `${ts} ${msg}\n`);
    } catch (_) {}
  }
}

export function notifDebugLog(msg) {
  line("[NOTIF] " + msg);
}
