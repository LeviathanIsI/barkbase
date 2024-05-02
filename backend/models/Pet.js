const mongoose = require("mongoose");
const { Schema } = mongoose;

const PetSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "Guest",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  species: {
    type: String,
    required: true,
  },
  breed: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  image: { type: String, required: false },
  notes: [{ type: Schema.Types.ObjectId, ref: "Note" }],
  medications: { type: String, required: false },
  specialNeeds: { type: String, required: false },
  feedingInstructions: { type: String, required: false },
  behavior: { type: String, required: false },
  lastVetVisit: { type: Date, required: false },
  nextVetVisit: { type: Date, required: false },
});

module.exports = mongoose.model("Pet", PetSchema);
