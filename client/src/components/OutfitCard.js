import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCollage from "./ItemCollage";
import { SERIF, monoLabel } from "../theme";
import { catalogNo } from "./Gallery";

// The outfit's required base slots, in display order
const BASE_SLOTS = [
    { key: "top", label: "Top" },
    { key: "pants", label: "Pants" },
    { key: "shoes", label: "Shoes" },
];

const OutfitCard = (props) => {
    const [outfit] = useState(props.outfit);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const navigate = useNavigate();

    const handleUpdate = () => {
        navigate("/outfit/update/" + outfit._id);
    };

    const handleDeleteConfirm = async () => {
        try {
            const response = await axios.delete("/outfits/delete/" + outfit._id);
            if (response.status === 200) {
                setDeleteOpen(false);
                props.onDeleteSuccess(outfit.name);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const glanceItems = BASE_SLOTS.map(({ key, label }) => ({
        label,
        item: outfit.base?.[key] || null,
    }));

    const tags = [outfit.season, outfit.occasion].filter(Boolean).join(" · ");

    return (
        <React.Fragment>
        <Box>
            {/* Outfit Image */}
            <Box
                onClick={handleUpdate}
                sx={{
                    aspectRatio: "3 / 4",
                    cursor: "pointer",
                    outline: "1px solid transparent",
                    transition: "outline-color 120ms",
                    "&:hover": { outlineColor: "primary.main" },
                }}
            >
                {outfit.previewImageUrl ? (
                    <Box
                        component="img"
                        src={outfit.previewImageUrl}
                        alt={outfit.name}
                        sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                ) : (
                    <ItemCollage
                        items={[outfit.base?.top, outfit.base?.pants, outfit.base?.shoes]}
                        size="100%"
                    />
                )}
            </Box>

            {/* Name + At-a-glance Items */}
            <Typography sx={{ ...monoLabel, color: "text.secondary", mt: 1.5 }}>
                Look {catalogNo(props.index ?? 0)}{tags && ` / ${tags}`}
            </Typography>
            <Typography sx={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.3, mb: 0.5 }}>
                {outfit.name || "Untitled outfit"}
            </Typography>
            {glanceItems.map(({ label, item }) => (
                <Stack key={label} direction="row" gap={1} sx={{ ...monoLabel, fontSize: 10 }}>
                    <Box component="span" sx={{ color: "text.disabled", width: 44 }}>{label}</Box>
                    <Box component="span" sx={{ color: item ? "text.secondary" : "text.disabled" }}>
                        {item ? item.name : "—"}
                    </Box>
                </Stack>
            ))}

            <Stack direction="row" gap={1} sx={{ mt: 1, ml: -1 }}>
                <Button size="small" onClick={handleUpdate}>
                    Edit
                </Button>
                <Button size="small" color="error" onClick={() => setDeleteOpen(true)}>
                    Delete
                </Button>
            </Stack>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Delete outfit</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete <strong>{outfit.name || "this outfit"}</strong>? This action cannot be undone.
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

export default OutfitCard;
