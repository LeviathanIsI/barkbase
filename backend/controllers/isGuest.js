require("dotenv").config();
const jwt = require("jsonwebtoken");

function checkGuest(req, res, next) {
  // Attempt to get the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Assuming the format is "Bearer <token>"

    // Verify the token using the secret key
    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        // Token verification failed
        return res.sendStatus(403); // Forbidden, or consider using a different status code based on your auth logic
      }

      // Token is valid, now check if the user role is "Guest"
      if (decoded.currentUser && decoded.currentUser.kind === "Guest") {
        // If the user is indeed a guest, proceed with the request
        req.user = decoded.currentUser; // Optionally, attach user info to the request object
        next();
      } else {
        // User is not a guest, redirect to the home page
        res.redirect("/");
      }
    });
  } else {
    // No token found, redirect to home page
    res.redirect("/");
  }
}

module.exports = checkGuest;
