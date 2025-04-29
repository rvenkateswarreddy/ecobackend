// models/farmerModel.js
const mongoose = require("mongoose");

const farmerSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  farmDetails: { type: String }, // Add custom fields for farmers
});

module.exports = mongoose.model("Farmer", farmerSchema);
