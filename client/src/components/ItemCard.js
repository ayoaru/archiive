import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import CardActions from "@mui/material/CardActions";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Box from "@mui/material/Box";
import { Button, Tabs, Tab } from "@mui/material";
import { useNavigate } from "react-router";
import axios from "axios";
import ImageIcon from "@mui/icons-material/Image";

const ItemCard = (props) => {
    const [item] = useState(props.item);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [imageTab, setImageTab] = useState(0);

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

    const currentImageUrl = imageTab === 0 ? item.imageFrontUrl : item.imageBackUrl;

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
            <CardHeader title={item.name} />

            {/* Image + Info Row */}
            <Stack direction="row" spacing={2} sx={{ padding: 2 }}>

                {/* Image with Front/Back Tabs */}
                <Stack direction="column" spacing={1}>
                    {(item.imageFrontUrl || item.imageBackUrl) ? (
                        <>
                            <Tabs
                                value={imageTab}
                                onChange={(e, val) => setImageTab(val)}
                                variant="fullWidth"
                                sx={{ minHeight: 32 }}
                            >
                                <Tab label="Front" sx={{ minHeight: 32, padding: "4px 8px" }} />
                                <Tab label="Back" sx={{ minHeight: 32, padding: "4px 8px" }} />
                            </Tabs>
                            {currentImageUrl ? (
                                <CardMedia
                                    component="img"
                                    image={currentImageUrl}
                                    alt={`${item.name} ${imageTab === 0 ? "front" : "back"}`}
                                    sx={{ width: 200, height: 200, objectFit: "cover", borderRadius: 1 }}
                                />
                            ) : (
                                <Stack alignItems="center" justifyContent="center" sx={{ width: 200, height: 200, bgcolor: "grey.100", borderRadius: 1 }}>
                                    <ImageIcon sx={{ fontSize: 80, color: "grey.400" }} />
                                    <Typography variant="caption" color="text.secondary">No image</Typography>
                                </Stack>
                            )}
                        </>
                    ) : (
                        <Stack alignItems="center" justifyContent="center" sx={{ width: 200, height: 200, bgcolor: "grey.100", borderRadius: 1 }}>
                            <ImageIcon sx={{ fontSize: 80, color: "grey.400" }} />
                        </Stack>
                    )}
                </Stack>

                {/* Item Details */}
                <CardContent sx={{ padding: 0, flex: 1 }}>
                    <Stack direction="column" spacing={1}>
                        <Typography variant="body1" color="text.primary">
                            {item.brand}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Category: {item.category}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Season: {item.season}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Style: {item.style}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Primary Color: {item.primary_color}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Secondary Color: {item.secondary_color}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Fit: {item.fit}
                        </Typography>
                    </Stack>
                </CardContent>
            </Stack>

            {/* Buttons */}
            <CardActions sx={{ padding: 2 }}>
                <Stack direction="row" gap={2}>
                    <Button
                        color="primary"
                        variant="contained"
                        onClick={() => handleUpdate(item._id)}
                    >
                        Update
                    </Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={() => setDeleteOpen(true)}
                    >
                        Delete
                    </Button>
                </Stack>
            </CardActions>

        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Are you sure you want to delete <strong>{item.name}</strong>? This action cannot be undone.
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

export default ItemCard;