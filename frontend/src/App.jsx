import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import NavBar from "./components/Navbar";
import Home from "./pages/Home";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <NavBar />
      {user ? (
        // Protected routes will go here
        <Test></Test>
      ) : (
        // Unprotected routes will go here
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
