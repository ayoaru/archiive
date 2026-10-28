import React from "react";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useColorMode } from "../colorMode";

// Switches between the dark and light looks
const ModeToggle = ({ sx }) => {
  const { mode, toggleMode } = useColorMode();
  const next = mode === "dark" ? "light" : "dark";

  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton
        onClick={toggleMode}
        aria-label={`Switch to ${next} mode`}
        size="small"
        sx={{ color: "text.secondary", "&:hover": { color: "primary.main" }, ...sx }}
      >
        {mode === "dark" ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
};

export default ModeToggle;
