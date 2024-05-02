const mongoose = require("mongoose");
const { Schema } = mongoose;

const NoteSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Note", NoteSchema);
