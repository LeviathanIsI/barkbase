import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import NavBar from "./components/Navbar";
import Auth from "./components/Auth";
import Home from "./pages/Home";
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
          <Route
            path="/login"
            element={<Auth user={user} setUser={setUser} />}
          />
          <Route
            path="/signup"
            element={<Auth user={user} setUser={setUser} />}
          />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
