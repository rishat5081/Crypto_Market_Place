const Joi = require("joi");
const mongoose = require("mongoose");

const user_token = mongoose.model(
  "user_token",
  new mongoose.Schema({
    contract_address: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    typeOfCoin: {
      type: String,
      required: true,
    },

    decimal: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      required: true,
    },

    switch_status: {
      type: Boolean,
      required: true,
    },
    updated_date: {
      type: Date,
    },
    providerType: {
      type: String,
      required: true,
    },
  })
);

module.exports.user_token = user_token;
