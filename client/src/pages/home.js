import React, { useEffect, useState } from "react";
import axios from "axios";

const Home = () => {
  const [closetList, setClosetList] = useState([]);

  useEffect(() => {
    getClosetItem();
  }, []);

  const getClosetItem = async () => {
    try {
      const response = await axios.get("http://localhost:5000/closet/read");
      setClosetList(response.data);
      console.log(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <React.Fragment>
      <h2>My Home</h2>
      {closetList.map((item) => (
        <div key={item._id}>
          <h3>{item.name}</h3>
          <p>Brand: {item.brand}</p>
          <p>Category: {item.category}</p>
          <p>Season: {item.season}</p>
          <p>Style: {item.style}</p>
          <p>Primary Color: {item.primary_color}</p>
          <p>Secondary Color: {item.secondary_color}</p>
          <p>Fit: {item.fit}</p>
          {/* <img src={item.image} alt={item.name} width="200" /> */}
          <hr />
        </div>
      ))}
    </React.Fragment>
  );
};

export default Home;