import React, { useEffect, useState } from "react";
import axios from "axios";
import { DeletedToast } from "../components/DeleteFeedback";
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

      <DeletedToast open={snackbarOpen} name={deletedItemName} onClose={() => setSnackbarOpen(false)} />

    </React.Fragment>
  );
};

export default Closet;