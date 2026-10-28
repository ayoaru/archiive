import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { UserButton } from "@clerk/react";
import { SERIF, monoLabel } from "../theme";
import ModeToggle from "./ModeToggle";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const LINKS = [
  { label: "Home", path: "/pages/home" },
  { label: "Closet", path: "/pages/closet" },
  { label: "Outfits", path: "/pages/outfit" },
  { label: "Wishlist", path: "/pages/wishlist" },
  { label: "Search", path: "/pages/searchItem" },
];

const NavBar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path) =>
    pathname === path || (path === "/pages/home" && pathname === "/");

  return (
    <AppBar position="static" sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Toolbar sx={{ gap: { xs: 2, md: 3 }, px: { xs: 2, sm: 4 }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
        <Typography
          component="div"
          onClick={() => navigate("/pages/home")}
          sx={{ fontFamily: SERIF, fontSize: 24, cursor: "pointer", flexGrow: 1 }}
        >
          archiive<Box component="span" sx={{ color: "primary.main" }}>.</Box>
        </Typography>

        {/* Below md the links drop to their own scrollable row under the logo */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            order: { xs: 1, md: 0 },
            width: { xs: "100%", md: "auto" },
            overflowX: { xs: "auto", md: "visible" },
            pb: { xs: 1, md: 0 },
          }}
        >
          {LINKS.map(({ label, path }) => (
            <Box
              key={path}
              component="button"
              onClick={() => navigate(path)}
              sx={{
                ...monoLabel,
                background: "none",
                border: 0,
                padding: "4px 0",
                cursor: "pointer",
                color: isActive(path) ? "text.primary" : "text.secondary",
                borderBottom: 2,
                borderColor: isActive(path) ? "primary.main" : "transparent",
                "&:hover": { color: "text.primary" },
              }}
            >
              {label}
            </Box>
          ))}
        </Box>

        <ModeToggle />
        <Button variant="contained" onClick={() => navigate("/pages/addItem")}>
          + Add
        </Button>
        <Box sx={{ display: "flex" }}>
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Settings"
                labelIcon={<SettingsOutlinedIcon sx={{ fontSize: 16 }} />}
                href="/pages/settings"
              />
            </UserButton.MenuItems>
          </UserButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
