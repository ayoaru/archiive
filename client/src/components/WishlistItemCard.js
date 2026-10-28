import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Box from "@mui/material/Box";
import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import axios from "axios";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { SERIF, monoLabel } from "../theme";
import { catalogNo } from "./Gallery";
import { ItemImage, ItemSpecs } from "./ItemCard";

const WishlistItemCard = (props) => {
    const [item] = useState(props.item);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const navigate = useNavigate();

    const handleUpdate = (id) => {
        navigate("/wishlist/update/" + id);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await axios.delete("/wishlist/delete/" + item._id);
            if (response.status === 200) {
                setDeleteOpen(false);
                props.onDeleteSuccess(item.name);
            }
        } catch (e) {
            console.log(e);
        }
    };

    return (
        <React.Fragment>
        <Box>
            <ItemImage item={item} />

            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1.5 }}>
                <Typography sx={{ ...monoLabel, color: "text.secondary" }}>
                    {catalogNo(props.index ?? 0)} / {item.category || "Uncategorized"}
                </Typography>
                {item.price && (
                    <Typography sx={{ ...monoLabel, color: "primary.main" }}>
                        £{item.price}
                    </Typography>
                )}
            </Stack>
            <Typography sx={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.3 }}>
                {item.name}
            </Typography>
            {item.brand && (
                <Typography variant="body2" color="text.secondary">
                    {item.brand}
                </Typography>
            )}
            <Box sx={{ mt: 0.5 }}>
                <ItemSpecs item={item} />
            </Box>

            <Stack direction="row" gap={1} sx={{ mt: 1, ml: -1 }}>
                <Button size="small" onClick={() => handleUpdate(item._id)}>
                    Edit
                </Button>
                <Button size="small" color="error" onClick={() => setDeleteOpen(true)}>
                    Delete
                </Button>
                {item.link && (
                    <Button
                        size="small"
                        color="inherit"
                        component="a"
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon sx={{ fontSize: "14px !important" }} />}
                    >
                        Shop
                    </Button>
                )}
            </Stack>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Delete item</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete <strong>{item.name}</strong>? This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
                <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
            </DialogActions>
        </Dialog>

        </React.Fragment>
    );
};

export default WishlistItemCard;
