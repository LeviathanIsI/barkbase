require("dotenv").config();
const jwt = require("jsonwebtoken");

function checkEmployee(req, res, next) {
  // Extract the token from the Authorization header
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1]; // Assumes format "Bearer <token>"

    jwt.verify(token, process.env.SECRET, (err, decoded) => {
      if (err) {
        // If there's an error (e.g., token is invalid or expired), respond accordingly
        return res.sendStatus(403); // Forbidden
      }

      // Check if the decoded token includes the currentUser object with kind "Employee"
      if (decoded.currentUser && decoded.currentUser.kind === "Employee") {
        req.user = decoded.currentUser; // Optionally set the user info on the request for downstream use
        next(); // Token is valid and the user is an Employee, proceed to the next middleware/route handler
      } else {
        // Valid token but not an Employee, redirect or handle as necessary
        res.redirect("/");
      }
    });
  } else {
    // No token provided, redirect or handle as necessary
    res.redirect("/");
  }
}

module.exports = checkEmployee;
