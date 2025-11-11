const mongoose = require("mongoose");
import dotenv from "dotenv";
require("dotenv").config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("ERREUR : MONGO_URI manquant dans .env");
  process.exit(1);
}

mongoose
  .connect(mongoUri)

module.exports = mongoose;
