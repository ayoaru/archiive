import React, { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import UdpateItemComponent from "../components/UpdateItemComponent";

const UpdateItem = () => {
  return (
    <React.Fragment>
      <NavBar />
      <UdpateItemComponent />
    </React.Fragment>
  );
};

export default UpdateItem;