import React, { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import axios from "axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { useNavigate } from "react-router-dom";
import OutfitCard from "../components/OutfitCard";

const Outfit = () => {
  const [outfitList, setOutfitList] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deletedOutfitName, setDeletedOutfitName] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    getOutfits();
  }, []);

  const getOutfits = async () => {
    try {
      const response = await axios.get("http://localhost:5000/outfits/read");
      setOutfitList(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleDeleteSuccess = (outfitName) => {
    setDeletedOutfitName(outfitName);
    setSnackbarOpen(true);
    getOutfits();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const goToAddOutfit = () => {
    navigate("/pages/addOutfit");
  };

  return (
    <React.Fragment>
      <Stack direction="row" alignItems="center" justifyContent="space-between" padding={2} paddingLeft={3} paddingRight={3}>
        <Typography variant="h4">
          Your Outfits
        </Typography>
        <Button variant="contained" onClick={goToAddOutfit}>
          + New
        </Button>
      </Stack>
      <Stack spacing={2} paddingLeft={2}>
        {outfitList.length !== 0 &&
          outfitList.map((outfit) => (
            <OutfitCard
              key={outfit._id}
              outfit={outfit}
              onDeleteSuccess={handleDeleteSuccess}
            />
          ))}
      </Stack>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: "100%", padding: 0, overflow: "hidden" }}
        >
          <Stack sx={{ padding: "6px 16px 10px 16px" }}>
            <strong>{deletedOutfitName}</strong> was successfully deleted.
          </Stack>
          <Box
            sx={{
              height: 4,
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.4)",
              "@keyframes countdown": {
                from: { width: "100%" },
                to: { width: "0%" },
              },
              animation: snackbarOpen ? "countdown 3s linear forwards" : "none",
            }}
          />
        </Alert>
      </Snackbar>

    </React.Fragment>
  );
};

export default Outfit;
