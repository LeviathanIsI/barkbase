import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EditFruit = () => {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [readyToEat, setReadyToEat] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetch(`http://localhost:3001/fruits/${id}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
      })
      .then((jsonRes) => {
        setName(jsonRes.name);
        setColor(jsonRes.color);
        setReadyToEat(jsonRes.readyToEat);
      });
  }, [id]);

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevents the default form submission behavior

    // Perform your submission logic here, e.g., sending data to a server
    // For demonstration, we'll just log the current form state to the console
    fetch(`http://localhost:3001/fruits/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, color, readyToEat, id }),
    })
      .then((res) => {
        if (res.ok) {
          return res.json(); // or you can directly navigate without waiting for the response
        } else {
          throw new Error("Failed to update fruit.");
        }
      })
      .then(() => {
        navigate("/"); // Navigate to home page after successful POST
      })
      .catch((error) => console.error("Error:", error));
  };

  return (
    <div className="text-black">
      <section class="hero">
        <h2>Edit a Fruit</h2>
      </section>
      {name && (
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
          <input className="text-white" type="submit" value="Edit Fruit" />
        </form>
      )}
    </div>
  );
};

export default EditFruit;
