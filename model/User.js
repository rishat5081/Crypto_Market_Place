const Joi = require("joi");
const mongoose = require("mongoose");

const User = mongoose.model(
  "User",
  new mongoose.Schema({
    phone_number: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },

    pin_code: {
      type: String,
      required: true,
    },
    created_date: {
      type: Date,
    },

    recoveryPhrase: {
      type: String,
      required: true,
    },
    walletAddress: {
      type: String,
      required: true,
    },
    privateKey: {
      type: String,
      required: true,
    },
    // recoveryPhraseBTC: {
    //   type: String,
    //   required: true,
    // },
    walletAddressBTC: {
      type: String,
      required: true,
    },
    privateKeyBTC: {
      type: String,
      required: true,
    },
  })
);

function validateUser(user) {
  const schema = Joi.object({
    email: Joi.string().required(),
    phone_number: Joi.string().required(),
    pin_code: Joi.string().required(),
    recoveryPhrase: Joi.string().required(),
    // BTCrecoveryPhrase: Joi.string().required(),
  });
  return schema.validate(user);
}

function validateResetPassword(user) {
  const schema = Joi.object({
    user_id: Joi.string().required(),
    old_pin_code: Joi.string().required(),
    new_pin_code: Joi.string().required(),
  });
  return schema.validate(user);
}

function validateLogin(user) {
  const schema = Joi.object({
    email: Joi.string().required(),
    pin_code: Joi.string().required(),
  });
  return schema.validate(user);
}

function sendOTPNumber(user) {
  const schema = Joi.object({
    phone_number: Joi.string().required(),
  });
  return schema.validate(user);
}

function varifyOTPNumber(user) {
  const schema = Joi.object({
    phone_number: Joi.string().required(),
    code: Joi.number().required(),
  });
  return schema.validate(user);
}
module.exports.User = User;
module.exports.varifyValidate = varifyOTPNumber;
module.exports.validate = validateUser;
module.exports.validateOTP = sendOTPNumber;
module.exports.validateLogin = validateLogin;
module.exports.validateResetPassword = validateResetPassword;
