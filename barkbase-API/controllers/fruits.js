/* Require modules
--------------------------------------------------------------- */
const express = require("express");
const router = express.Router();

/* Require the db connection, and models
--------------------------------------------------------------- */
const db = require("../models");

// INDEX - Returns all fruits as JSON
router.get("/", (req, res) => {
  db.Fruit.find({})
    .then((fruits) => res.json(fruits))
    .catch((err) => res.json({ error: err.message }));
});

// CREATE - Adds a new fruit and returns the created fruit as JSON
router.post("/", (req, res) => {
  if (req.body.readyToEat === "on") req.body.readyToEat = true;
  else req.body.readyToEat = false;
  console.log(req.body);
  db.Fruit.create(req.body)
    .then((fruit) => res.json(fruit))
    .catch((err) => res.json({ error: err.message }));
});

// SHOW - Returns a single fruit by ID as JSON
router.get("/:id", (req, res) => {
  db.Fruit.findById(req.params.id)
    .then((fruit) => {
      if (!fruit) res.status(404).json({ error: "Fruit not found" });
      else res.json(fruit);
    })
    .catch((err) => res.json({ error: err.message }));
});

// UPDATE - Updates a specific fruit and returns the updated fruit as JSON
router.put("/:id", (req, res) => {
  if (req.body.readyToEat === "on") req.body.readyToEat = true;
  else req.body.readyToEat = false;

  db.Fruit.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((fruit) => res.json(fruit))
    .catch((err) => res.json({ error: err.message }));
});

// DELETE - Deletes a specific fruit and returns a success message
router.delete("/:id", (req, res) => {
  db.Fruit.findByIdAndDelete(req.params.id)
    .then(() => res.json({ message: "Fruit successfully deleted" }))
    .catch((err) => res.json({ error: err.message }));
});

module.exports = router;
