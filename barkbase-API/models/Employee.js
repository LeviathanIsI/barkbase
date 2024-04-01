const mongoose = require("mongoose");
const User = require("./User");
const { Schema } = mongoose;
const options = { discriminatorKey: "kind" };

const EmployeeSchema = User.discriminator(
  "Employee",
  new mongoose.Schema(
    {
      employeeID: { type: Number, required: true, unique: true },
      userType: { type: String, default: "Employee" },
      role: { type: String, default: "Admin" },
      startDate: { type: Date, default: Date.now },
      caringFor: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Pet",
        },
      ],
    },
    options
  )
);

module.exports = EmployeeSchema;
