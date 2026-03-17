const mongoose = require("mongoose");
require("dotenv").config();

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  process.stderr.write("ERREUR : MONGO_URI manquant dans .env\n");
  process.exit(1);
}

mongoose
  .connect(mongoUri)

module.exports = mongoose;
