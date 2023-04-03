const Joi = require("joi");
const mongoose = require("mongoose");

const signup_users_code = mongoose.model(
  "signup_users_code",
  new mongoose.Schema({
    email: {
      type: String,
      required: true,
    },
    email_code: {
      type: Number,
      required: true,
    },
  })
);

module.exports.signup_users_code = signup_users_code;
