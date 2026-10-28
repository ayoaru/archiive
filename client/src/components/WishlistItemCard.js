import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { Button, Tooltip } from "@mui/material";
import { useNavigate } from "react-router";
import axios from "axios";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { SERIF, monoLabel } from "../theme";
import { catalogNo } from "./Gallery";
import { DeleteDialog } from "./DeleteFeedback";
import { ItemImage, ItemSpecs } from "./ItemCard";
import { usePriceFormatter } from "../profile";

const WishlistItemCard = (props) => {
    const [item] = useState(props.item);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const formatPrice = usePriceFormatter();
    const price = formatPrice(item.price, item.currency);

    const navigate = useNavigate();

    const handleUpdate = (id) => {
        navigate("/wishlist/update/" + id);
    };

    // Throws on failure so the dialog can show the error
    const handleDelete = async () => {
        await axios.delete("/wishlist/delete/" + item._id);
        setDeleteOpen(false);
        props.onDeleteSuccess(item.name);
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
                    <Tooltip title={price.original ? `Listed at ${price.original}` : ""}>
                        <Typography sx={{ ...monoLabel, color: "primary.main" }}>
                            {price.label}
                        </Typography>
                    </Tooltip>
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

        <DeleteDialog
            open={deleteOpen}
            onClose={() => setDeleteOpen(false)}
            onConfirm={handleDelete}
            name={item.name}
            from="your wishlist"
        />

        </React.Fragment>
    );
};

export default WishlistItemCard;
