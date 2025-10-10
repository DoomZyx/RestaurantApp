import dotenv from "dotenv";
dotenv.config();

export const config = {
  Twilio_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
  Twilio_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
  Twilio_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  PUBLIC_HOST: process.env.PUBLIC_HOST,
  PORT: process.env.PORT || 3000,
};
