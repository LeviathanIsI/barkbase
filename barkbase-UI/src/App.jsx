import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import Auth from "./components/Auth";
import Home from "./pages/Home";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <Navbar user={user} setUser={setUser} />
    </div>
  );
}

export default App;
