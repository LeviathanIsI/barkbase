import React from "react";

const Navbar = () => {
  return (
    <nav>
      <ul className="flex justify-around">
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/fruits/new">Pricing</a>
        </li>
        <li>
          <a href="/fruits/new">Login</a>
        </li>
        <li>
          <a href="/fruits/new">Signup</a>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
