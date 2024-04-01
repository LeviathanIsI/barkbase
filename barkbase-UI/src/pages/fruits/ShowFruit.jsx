import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

const ShowFruit = () => {
  const { id } = useParams();
  const [fruit, setFruit] = useState(null);
  useEffect(() => {
    fetch(`http://localhost:3001/fruits/${id}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
      })
      .then((jsonRes) => setFruit(jsonRes));
  }, [id]);

  return (
    <div className="text-black">
      <h1>Fruits Show Page</h1>
      <p>
        {fruit && (
          <div>
            <p>
              The Fruits name is {fruit.name} and its color is{" "}
              <span style={{ color: fruit.color }}>{fruit.color}</span>
            </p>
            {fruit.readyToEat === true ? (
              <span>It is ready to eat</span>
            ) : (
              <span>It is not ready to eat</span>
            )}
            <div className="showPageContainer">
              <Link className="mx-5" to={`/fruits/${fruit._id}/edit`}>
                Edit this Fruit
              </Link>
              <Link className="mx-5" to="/">
                Home
              </Link>
            </div>
          </div>
        )}
      </p>
    </div>
  );
};

export default ShowFruit;
