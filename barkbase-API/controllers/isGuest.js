// Purpose: Check if the user is a guest and redirect to the home page if not.
function checkGuest(req, res, next) {
  if (req.session.currentUser && req.session.currentUser.kind === "Guest") {
    return next();
  } else {
    res.redirect("/");
  }
}

module.exports = checkGuest;
