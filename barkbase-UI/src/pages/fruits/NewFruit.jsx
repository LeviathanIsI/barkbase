import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const NewFruit = () => {
  // Initialize state for each input field
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [readyToEat, setReadyToEat] = useState(false);
  const navigate = useNavigate();
  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault(); // Prevents the default form submission behavior

    // Perform your submission logic here, e.g., sending data to a server
    // For demonstration, we'll just log the current form state to the console
    fetch(`http://localhost:3001/fruits/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, color, readyToEat }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json(); // or you can directly navigate without waiting for the response
        } else {
          throw new Error("Failed to create fruit.");
        }
      })
      .then(() => {
        navigate("/"); // Navigate to home page after successful POST
      })
      .catch((error) => console.error("Error:", error));
  };

  return (
    <div className="text-black">
      <h1>Create New Fruit</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name:</label>
        <input
          className="text-white"
          type="text"
          name="name"
          id="name"
          placeholder="Enter a name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="color">Color:</label>
        <input
          className="text-white"
          type="text"
          name="color"
          id="color"
          placeholder="Enter a color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <label htmlFor="readyToEat">Is ready to eat</label>
        <input
          className="text-white"
          type="checkbox"
          name="readyToEat"
          id="readyToEat"
          checked={readyToEat}
          onChange={(e) => setReadyToEat(e.target.checked)}
        />
        <input className="text-white" type="submit" value="Create Fruit" />
      </form>
      <a href="/fruits">Go back</a>
    </div>
  );
};

export default NewFruit;
