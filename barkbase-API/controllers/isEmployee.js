// Purpose: Check if the user is an employee and redirect to the home page if not.

function checkEmployee(req, res, next) {
  if (req.session.currentUser && req.session.currentUser.kind === "Employee") {
    return next();
  } else {
    res.redirect("/");
  }
}

module.exports = checkEmployee;
