import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const Home = () => {
  const [fruits, setFruits] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/fruits")
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
      })
      .then((jsonRes) => setFruits(jsonRes));
  }, []);

  const handleDelete = (id) => {
    fetch(`http://localhost:3001/fruits/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          throw new Error("Failed to delete fruit.");
        }
      })
      .then(() => {
        navigate("/");
      });
  };
  return (
    <div>
      <h1>Index Page</h1>

      <ul className="flex flex-col">
        {fruits &&
          fruits.map((item, index) => {
            return (
              <li className="flex">
                <Link className="mx-5" to={`/fruits/${item._id}`}>
                  {item.name}
                </Link>
                <form onSubmit={() => handleDelete(item._id)}>
                  <input type="submit" value="DELETE" />
                </form>
              </li>
            );
          })}
      </ul>
    </div>
  );
};

export default Home;
