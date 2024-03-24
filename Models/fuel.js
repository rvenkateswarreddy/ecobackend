// models/fuelData.js

const mongoose = require("mongoose");

const fuelDataSchema = new mongoose.Schema({
  fuel: {
    type: String,
    required: true,
  },
  langKey: String,
  measuredBy: String,
  CO2Emission: String,
  CH4Emission: String,
  N2OEmission: String,
  GHGEmission: String,
  _comments: String,
});

module.exports = mongoose.model("FuelData", fuelDataSchema);
