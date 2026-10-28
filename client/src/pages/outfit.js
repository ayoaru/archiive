import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import axios from "axios";
import { DeletedToast } from "../components/DeleteFeedback";
import { PageHeader, Gallery } from "../components/Gallery";
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

  const goToAddOutfit = () => {
    navigate("/pages/addOutfit");
  };

  return (
    <React.Fragment>
      <PageHeader
        title="The outfits"
        count={outfitList.length}
        countLabel="looks"
        action={<Button variant="contained" onClick={goToAddOutfit}>+ New</Button>}
      />
      <Gallery>
        {outfitList.map((outfit, i) => (
          <OutfitCard
            key={outfit._id}
            outfit={outfit}
            index={i}
            onDeleteSuccess={handleDeleteSuccess}
          />
        ))}
      </Gallery>

      <DeletedToast open={snackbarOpen} name={deletedOutfitName} onClose={() => setSnackbarOpen(false)} />

    </React.Fragment>
  );
};

export default Outfit;
