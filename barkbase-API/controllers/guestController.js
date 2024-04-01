const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const db = require("../models");
const isAuthenticated = require("./isAuthenticated");
const checkGuest = require("./isGuest");
const { Guest } = db;

// Initialize multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// I.N.D.U.C.E.S. - Index, New, Delete, Update, Create, Edit, Show

// Index Route - Will take guests to their dashboard
router.get("/home", isAuthenticated, checkGuest, (req, res) => {
  res.render("users/guest/homeGuest.ejs", {
    currentUser: req.session.currentUser,
  });
});

// Settings Index - Will takes guests to their settings page
router.get("/settings", isAuthenticated, checkGuest, async (req, res) => {
  const currentUser = await db.Guest.findById(
    req.session.currentUser._id
  ).populate("pets");
  res.render("users/guest/settingsGuest.ejs", {
    currentUser: currentUser.toObject(),
  });
});

// New Route
// Initial user creation handled in server.js

// New Route for adding a pet - Take guests to the add pet page
router.get("/home/add", isAuthenticated, checkGuest, (req, res) => {
  res.render("users/guest/addpetGuest.ejs", {
    currentUser: req.session.currentUser,
  });
});

// Delete Route - Allows guests to remove their pets from their profile and database
router.delete("/pets/:petId", isAuthenticated, checkGuest, async (req, res) => {
  const { petId } = req.params;
  try {
    // Remove the pet from the Pets collection
    await db.Pet.findOneAndDelete({ _id: petId });

    // Pull the pet from the currentUser's pets array
    await db.Guest.findByIdAndUpdate(req.session.currentUser._id, {
      $pull: { pets: petId },
    });

    // Update the session information to ensure the guests pets array is accurate
    const updatedGuest = await db.Guest.findById(
      req.session.currentUser._id
    ).populate("pets");
    req.session.currentUser = updatedGuest;

    res
      .status(200)
      .json({ success: true, message: "Pet deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).redirect("/guest/home");
  }
});

// Update Route
router.post("/settings", isAuthenticated, checkGuest, async (req, res) => {
  const { address, city, state, zip } = req.body;
  const userId = req.session.currentUser._id;

  try {
    const updatedGuest = await Guest.findByIdAndUpdate(
      userId,
      {
        address,
        city,
        state,
        zip,
      },
      { new: true } // Note to self: { new: true } is necessary to return the updated document to display on page without needing to refresh
    );

    // Update the session information
    req.session.currentUser = {
      // Use spread operator to grab all the existing key value pairs and copies them to the new object
      ...req.session.currentUser,
      // This will grab additional properties from the updatedGuest object and overwrite the existing properties
      address,
      city,
      state,
      zip,
    };

    // Respond with the updated address information
    res.json({
      success: true,
      address: updatedGuest.address,
      city: updatedGuest.city,
      state: updatedGuest.state,
      zip: updatedGuest.zip,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
});

// Update pet route
router.post(
  "/pets/:id/update",
  isAuthenticated,
  checkGuest,
  async (req, res) => {
    const {
      name,
      age,
      weight,
      medications,
      specialNeeds,
      feedingInstructions,
      behavior,
      lastVetVisit,
      nextVetVisit,
      noteContent,
    } = req.body;
    try {
      await db.Pet.findByIdAndUpdate(req.params.id, {
        name,
        age,
        weight,
        medications,
        specialNeeds,
        feedingInstructions,
        behavior,
        lastVetVisit,
        nextVetVisit,
      });

      res.redirect(`/guest/pets/${req.params.id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to update pet");
    }
  }
);

// Create Route
// Initial user creation handled in server.js

// Create route for adding a pet
router.post(
  "/pets/add",
  isAuthenticated,
  checkGuest,
  upload.single("petImage"),
  async (req, res) => {
    // Destructure the pet information from the request body
    const { name, species, breed, age, weight } = req.body;
    // If there is a file, set the petImage to the path, otherwise set it to null
    let petImage = req.file ? req.file.path : null;
    // If there is a petImage, uses REGEX to replace the backslashes with forward slashes - this is necessary since the file system uses backslashes and the web uses forward slashes
    if (petImage) {
      petImage = petImage.replace(/\\/g, "/");
    }
    try {
      const newPet = await db.Pet.create({
        owner: req.session.currentUser,
        name,
        species,
        breed,
        age,
        weight,
        image: petImage,
      });

      const updatedGuest = await db.Guest.findByIdAndUpdate(
        req.session.currentUser._id,
        { $push: { pets: newPet._id } },
        { new: true }
      ).populate("pets");

      req.session.currentUser = updatedGuest;

      res.redirect("/guest/home");
    } catch (error) {
      console.log(error);
      res.status(500).send("Error creating pet. Please try again.");
    }
  }
);

// Edit Route - Allows guests to edit their profile information
router.get("/settings", isAuthenticated, checkGuest, (req, res) => {
  res.render("users/guest/settingsGuest.ejs", {
    currentUser: req.session.currentUser,
    pets: req.session.currentUser.pets,
  });
});

// Pet edit route - Allows guests to edit their pet information
router.get("/pets/:id/edit", isAuthenticated, checkGuest, async (req, res) => {
  const petId = req.params.id;
  try {
    const pet = await db.Pet.findById(petId);
    if (!pet) {
      console.error("Pet not found");
      return res.status(404).send("Pet not found");
    }

    res.render("users/guest/editpetGuest.ejs", {
      pet: pet,
      currentUser: req.session.currentUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching pet data");
  }
});

// Show Route - Allows guests to view their pet's information
router.get("/pets/:petId", isAuthenticated, checkGuest, async (req, res) => {
  const { petId } = req.params;
  const pet = await db.Pet.findById(petId);
  res.render("users/guest/petGuestShow.ejs", {
    currentUser: req.session.currentUser,
    pet: pet,
  });
});

module.exports = router;
