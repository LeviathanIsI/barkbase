import { useState } from "react";
import { Route, Routes } from "react-router-dom";

import "./App.css";
import Navbar from "./components/Navbar";
import Auth from "./components/Auth";
import Home from "./pages/Home";
import EditFruit from "./pages/fruits/EditFruit";
import ShowFruit from "./pages/fruits/ShowFruit";
import NewFruit from "./pages/fruits/NewFruit";
import Footer from "./components/Footer";

function App() {
  const [user, setUser] = useState(null);

  return (
    <div>
      <Navbar />
      {user ? (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fruits/new" element={<NewFruit />} />
          <Route path="/fruits/:id" element={<ShowFruit />} />
          <Route path="/fruits/:id/edit" element={<EditFruit />} />
        </Routes>
      ) : (
        <Auth user={user} setUser={setUser} />
      )}
      <Footer />
    </div>
  );
}

export default App;
