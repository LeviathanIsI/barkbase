const isAuthenticated = require("../controllers/isAuthenticated");

function checkEmployee(req, res, next) {
  if (req.session.currentUser && req.session.currentUser.kind === "Employee") {
    return next();
  } else {
    res.redirect("/login");
  }
}

module.exports = checkEmployee;