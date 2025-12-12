import React from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const NavBar = () => {
  const navigate = useNavigate();

  const goToHome = () => {
    navigate("/pages/home");
  };

  const goToAddItem = () => {
    navigate("/pages/addItem");
  };

  return (
    <React.Fragment>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
              }}
            >
              ARCHIIVE
            </Typography>
            <Button color="inherit" onClick={goToHome}>
              Home
            </Button>
            <Button color="inherit" onClick={goToAddItem}>
              Add Item
            </Button>
          </Toolbar>
        </AppBar>
      </Box>
    </React.Fragment>
  );
};

export default NavBar;