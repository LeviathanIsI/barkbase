/* Require modules
--------------------------------------------------------------- */
require("dotenv").config();
const path = require("path");
const express = require("express");
const livereload = require("livereload");
const connectLiveReload = require("connect-livereload");
const morgan = require("morgan");
const cors = require("cors");
// process.env will look at the environment for environment variables
const PORT = process.env.PORT || 3001;
// and pass them if needed.

/* Require the db connection, models, and seed data
--------------------------------------------------------------- */
const db = require("./models");

// Generates a random employee ID between 1 and 1000
const generateEmployeeID = () => Math.floor(Math.random() * 1000);

// Checks to make sure the employee ID is unique
const isUniqueEmployeeID = async (employeeID) => {
  const employee = await db.Employee.findOne({ employeeID: employeeID });
  return !employee;
};

const employeeCtrl = require("./controllers/employeeController");
const guestCtrl = require("./controllers/guestController");
const signupCtrl = require("./controllers/signupController");
/* Create the Express app
--------------------------------------------------------------- */
const app = express();
/* Configure the app to refresh the browser when nodemon restarts
--------------------------------------------------------------- */
const liveReloadServer = livereload.createServer();

liveReloadServer.server.once("connection", () => {
  // wait for nodemon to fully restart before refreshing the page
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

/* Middleware (app.use)
--------------------------------------------------------------- */
// Indicates where our static files are located
app.use(cors());
app.use(express.static("public"));
// Use the connect-livereload package to connect nodemon and livereload
app.use(connectLiveReload());
// Body parser: used for POST/PUT/PATCH routes:
// this will take incoming strings from the body that are URL encoded and parse them
// into an object that can be accessed in the request parameter as a property called body (req.body).
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(morgan("dev")); // morgan is just a logger

// I.N.D.U.C.E.S. - Index, New, Delete, Update, Create, Edit, Show

app.use("/", signupCtrl);
app.use("/employee", employeeCtrl);
app.use("/guest", guestCtrl);

// The "catch-all" route: Runs for any other URL that doesn't match the above routes
app.get("*", function (req, res) {
  res.render("404");
});

// app.listen lets our app know which port to run
app.listen(PORT, () => {
  console.log("Their power level is over", PORT);
});
