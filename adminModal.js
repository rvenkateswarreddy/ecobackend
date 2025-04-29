// models/adminModel.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  fullname: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" }, // Default role for admin
});

module.exports = mongoose.model("Admin", adminSchema);
