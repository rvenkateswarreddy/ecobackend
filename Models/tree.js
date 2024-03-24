// models/treeData.js

const mongoose = require("mongoose");

const treeDataSchema = new mongoose.Schema({
  treeName: {
    type: String,
    required: true,
  },
  CO2Emission: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("TreeData", treeDataSchema);
