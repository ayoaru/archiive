import React, { useEffect, useState } from "react";
import Stack from "@mui/material/Stack";
import axios from "axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { PageHeader, Gallery } from "../components/Gallery";
import ItemCard from "../components/ItemCard";

const Closet = () => {
  const [closetList, setClosetList] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deletedItemName, setDeletedItemName] = useState("");

  useEffect(() => {
    getClosetItem();
  }, []);

  const getClosetItem = async () => {
    try {
      const response = await axios.get("http://localhost:5000/closet/read");
      setClosetList(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleDeleteSuccess = (itemName) => {
    setDeletedItemName(itemName);
    setSnackbarOpen(true);
    getClosetItem();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  return (
    <React.Fragment>
      <PageHeader title="The closet" count={closetList.length} />
      <Gallery>
        {closetList.map((item, i) => (
          <ItemCard
            key={item._id}
            item={item}
            index={i}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ))}
      </Gallery>

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
            <strong>{deletedItemName}</strong> was successfully deleted.
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

export default Closet;