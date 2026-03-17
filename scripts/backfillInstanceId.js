/**
 * Backfill instanceId sur tous les documents existants.
 * Crée l'instance par défaut (inst_default) si besoin et assigne son ID partout.
 * Exécution : depuis la racine backend : node scripts/backfillInstanceId.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const DEFAULT_INSTANCE_ID = "inst_default";
const DEFAULT_SLUG = "default";

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI manquant. Démarrez depuis backend/ avec .env chargé.");
  }

  await mongoose.connect(mongoUri);

  const { InstanceModel } = await import("../storage/models/Instance.js");
  const PricingModel = (await import("../models/pricing.js")).default;
  const OrderModel = (await import("../models/order.js")).default;
  const ReservationModel = (await import("../models/reservation.js")).default;
  const ClientModel = (await import("../models/client.js")).default;
  const CallMonitorModel = (await import("../models/callMonitor.js")).default;
  const ClientQuotaModel = (await import("../models/clientQuota.js")).default;
  const User = (await import("../models/user.js")).default;

  let instance = await InstanceModel.findOne({ instanceId: DEFAULT_INSTANCE_ID });
  if (!instance) {
    instance = await InstanceModel.create({
      instanceId: DEFAULT_INSTANCE_ID,
      name: "Instance par défaut",
      slug: DEFAULT_SLUG,
      plan: "echauffement",
      status: "active",
    });
    console.log("Instance par défaut créée:", instance.instanceId);
  } else {
    console.log("Instance par défaut déjà présente:", instance.instanceId);
  }

  const updateAll = async (Model, name) => {
    const res = await Model.updateMany(
      { $or: [{ instanceId: { $exists: false } }, { instanceId: null }, { instanceId: "" }] },
      { $set: { instanceId: DEFAULT_INSTANCE_ID } }
    );
    console.log(`${name}: matched=${res.matchedCount} modified=${res.modifiedCount}`);
  };

  await updateAll(PricingModel, "Pricing");
  await updateAll(OrderModel, "Order");
  await updateAll(ReservationModel, "Reservation");
  await updateAll(ClientModel, "Client");
  await updateAll(CallMonitorModel, "CallMonitor");
  await updateAll(ClientQuotaModel, "ClientQuota");
  await updateAll(User, "User");

  await mongoose.disconnect();
  console.log("Backfill terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
