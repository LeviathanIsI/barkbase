const mongoose = require("mongoose");
const User = require("./User");
const { Schema } = mongoose;
const options = { discriminatorKey: "kind" };

const GuestSchema = User.discriminator(
  "Guest",
  new mongoose.Schema(
    {
      phoneNumber: String,
      address: String,
      city: String,
      state: String,
      zip: String,
      userType: { type: String, default: "Guest" },
      pets: [
        {
          type: Schema.Types.ObjectId,
          ref: "Pet",
        },
      ],
    },
    options
  )
);

module.exports = GuestSchema;
