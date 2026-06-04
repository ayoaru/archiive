import React, { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import axios from "axios";

import ItemCard from "../components/ItemCard";

const name = "Ayomide";

const randomizeMessage = () => {
  const messages = [
    `Welcome back, ${name}!`,
    `Looking good, ${name}!`,
    `Looking stylish, ${name}!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

const Home = () => {
  const [closetList, setClosetList] = useState([]);
  
  useEffect(() => {
    getClosetItem();
  }, []);
  
  const getClosetItem = async () => {
    try {
      const response = await axios.get("http://localhost:5000/closet/read");
      setClosetList(response.data);
      //console.log(response.data);
    } catch (e) {
      console.log(e);
    }
  };
  
  
  
  return (
    <React.Fragment>
    <Typography variant="h4" padding={2} paddingLeft={3}>
    {randomizeMessage()}
    </Typography>
    <Stack spacing={2} paddingLeft={2}>
    {closetList.map((item) => (
      <ItemCard key={item._id} item={item} getItem={getClosetItem} />
    ))}
      </Stack>
      </React.Fragment>
    );
  };
  
  export default Home;