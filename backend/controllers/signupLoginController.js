// Importing required modules
require("dotenv").config();
const express = require("express");
const router = express.Router();
const Employee = require("../models/Employee");
const Guest = require("../models/Guest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const createToken = require("../utils/createToken");

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    const token = createToken(newUser);
    res.status(201).json({ token, newUser });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error(`User not found for email: ${email}`);
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error("Password does not match");
    }
    const token = createToken(user);
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ msg: error.message });
  }
});

// Exporting the router
module.exports = router;
