// models/perCapitaEmission.js

const mongoose = require("mongoose");

const perCapitaEmissionSchema = new mongoose.Schema({
  Country: {
    type: String,
    required: true,
  },
  CountryCode: {
    type: Number,
    required: true,
  },
  SeriesCode: {
    type: Number,
    required: true,
  },
  MDG: String,
  Series: String,
  Footnotes: String,
  Type: String,
  emissions: {
    type: Map,
    of: Number,
  },
});

module.exports = mongoose.model("PerCapitaEmission", perCapitaEmissionSchema);
