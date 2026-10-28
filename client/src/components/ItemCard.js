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
import ImageIcon from "@mui/icons-material/Image";
import { SERIF, monoLabel } from "../theme";
import { catalogNo } from "./Gallery";

// Front/back image with a small mono toggle, shared by closet and wishlist tiles
export const ItemImage = ({ item }) => {
    const [side, setSide] = useState("front");
    const hasBoth = item.imageFrontUrl && item.imageBackUrl;
    const url = side === "front" ? item.imageFrontUrl : item.imageBackUrl;

    return (
        <Box
            sx={{
                position: "relative",
                aspectRatio: "3 / 4",
                bgcolor: "grey.100",
                outline: "1px solid transparent",
                transition: "outline-color 120ms",
                "&:hover": { outlineColor: "primary.main" },
            }}
        >
            {url ? (
                <Box
                    component="img"
                    src={url}
                    alt={`${item.name} ${side}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
            ) : (
                <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                    <ImageIcon sx={{ fontSize: 56, color: "grey.400" }} />
                </Stack>
            )}
            {hasBoth && (
                <Stack direction="row" sx={{ position: "absolute", bottom: 8, left: 8 }}>
                    {["front", "back"].map((s) => (
                        <Box
                            key={s}
                            component="button"
                            onClick={() => setSide(s)}
                            sx={{
                                ...monoLabel,
                                fontSize: 10,
                                border: 0,
                                cursor: "pointer",
                                padding: "2px 6px",
                                bgcolor: side === s ? "text.primary" : "overlay",
                                color: side === s ? "background.default" : "text.secondary",
                            }}
                        >
                            {s}
                        </Box>
                    ))}
                </Stack>
            )}
        </Box>
    );
};

// Mono spec lines under a tile, skipping empty fields
export const ItemSpecs = ({ item }) => {
    const colors = [item.primary_color, item.secondary_color].filter(Boolean).join(" / ");
    const rows = [
        [item.season, item.style].filter(Boolean).join(" · "),
        [item.fit, colors].filter(Boolean).join(" · "),
    ].filter(Boolean);

    return rows.map((row) => (
        <Typography key={row} sx={{ ...monoLabel, fontSize: 10, color: "text.disabled" }}>
            {row}
        </Typography>
    ));
};

const ItemCard = (props) => {
    const [item] = useState(props.item);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const navigate = useNavigate();

    const handleUpdate = (id) => {
        navigate("/closet/update/" + id);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await axios.delete("/closet/delete/" + item._id);
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

            <Typography sx={{ ...monoLabel, color: "text.secondary", mt: 1.5 }}>
                {catalogNo(props.index ?? 0)} / {item.category || "Uncategorized"}
            </Typography>
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

export default ItemCard;
