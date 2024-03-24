const mongoose = require("mongoose");

const registerDetailsSchema = new mongoose.Schema({
  usertype: { type: String, required: true },
  secretkey: { type: String, required: false },
  fullname: { type: String, required: false },
  email: { type: String, required: true },
  mobile: { type: String, required: true },
  password: { type: String, required: true },
  confirmpassword: { type: String, required: true },
});

const registerDetails = mongoose.model(
  "registerDetails",
  registerDetailsSchema
);

module.exports = registerDetails;
