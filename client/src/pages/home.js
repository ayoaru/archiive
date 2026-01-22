import React, { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import axios from "axios";

import ItemCard from "../components/ItemCard";

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
      <Typography variant="h2" padding={2} paddingLeft={3}>My Closet</Typography>
      <Stack spacing={2} paddingLeft={2}>
      {closetList.length !== 0 &&
        closetList.map((item) => <ItemCard key={item._id} item={item} />)}
      </Stack>
    </React.Fragment>
  );
};

export default Home;