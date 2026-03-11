import fastify from "./app.js";
import { config } from "./Config/env.js";
import mongoose from "mongoose";

const PORT = config.PORT;
const HOST = "0.0.0.0";

const close = async () => {
  try {
    await fastify.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
};

process.on("SIGINT", close);
process.on("SIGTERM", close);

try {
  await fastify.listen({ port: PORT, host: HOST });
} catch (err) {
  console.error(err);
  process.exit(1);
}