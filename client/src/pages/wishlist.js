import React, { useEffect, useState } from "react";
import axios from "axios";
import { DeletedToast } from "../components/DeleteFeedback";
import { PageHeader, Gallery } from "../components/Gallery";
import WishlistItemCard from "../components/WishlistItemCard";

const Wishlist = () => {
  const [wishlistList, setWishlistList] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deletedItemName, setDeletedItemName] = useState("");

  useEffect(() => {
    getWishlistItem();
  }, []);

  const getWishlistItem = async () => {
    try {
      const response = await axios.get("http://localhost:5000/wishlist/read");
      setWishlistList(response.data);
    } catch (e) {
      console.log(e);
    }
  };

  const handleDeleteSuccess = (itemName) => {
    setDeletedItemName(itemName);
    setSnackbarOpen(true);
    getWishlistItem();
  };

  return (
    <React.Fragment>
      <PageHeader title="The wishlist" count={wishlistList.length} countLabel="wants" />
      <Gallery>
        {wishlistList.map((item, i) => (
          <WishlistItemCard
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

export default Wishlist;