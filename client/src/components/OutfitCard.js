import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCollage from "./ItemCollage";

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

    return (
        <React.Fragment>
        <Card
            variant="outlined"
            sx={{
                width: 750,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <Stack direction="row" spacing={2} sx={{ padding: 2 }}>

                {/* Outfit Image + Actions */}
                <Stack direction="column" spacing={1} alignItems="center">
                    {outfit.previewImageUrl ? (
                        <CardMedia
                            component="img"
                            image={outfit.previewImageUrl}
                            alt={outfit.name}
                            sx={{ width: 200, height: 200, objectFit: "cover", borderRadius: 1 }}
                        />
                    ) : (
                        <ItemCollage
                            items={[outfit.base?.top, outfit.base?.pants, outfit.base?.shoes]}
                            size={200}
                        />
                    )}
                    <Stack direction="row" gap={1}>
                        <Button
                            size="small"
                            color="primary"
                            variant="contained"
                            onClick={handleUpdate}
                        >
                            Update
                        </Button>
                        <Button
                            size="small"
                            color="error"
                            variant="contained"
                            onClick={() => setDeleteOpen(true)}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>

                {/* Name + At-a-glance Items */}
                <CardContent sx={{ padding: 0, flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                        {outfit.name || "Untitled Outfit"}
                    </Typography>
                    <Stack direction="column" spacing={1}>
                        {glanceItems.map(({ label, item }) => (
                            <Typography
                                key={label}
                                variant="body1"
                                color={item ? "text.primary" : "text.disabled"}
                            >
                                {label}: {item ? item.name : "—"}
                            </Typography>
                        ))}
                    </Stack>
                </CardContent>
            </Stack>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Delete Outfit</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete <strong>{outfit.name || "this outfit"}</strong>? This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setDeleteOpen(false)} color="primary">Cancel</Button>
                <Button onClick={handleDeleteConfirm} color="error" variant="contained">Delete</Button>
            </DialogActions>
        </Dialog>

        </React.Fragment>
    );
};

export default OutfitCard;
