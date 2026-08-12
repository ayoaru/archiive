import React from "react";
import Box from "@mui/material/Box";
import ImageIcon from "@mui/icons-material/Image";

// Fallback outfit preview: a simple grid of item thumbnails, shown when
// there's no uploaded picture or generated VTO image to display instead.
const ItemCollage = ({ items = [], size = 200 }) => {
    const filled = items.filter((item) => item?.imageFrontUrl);

    if (filled.length === 0) {
        return (
            <Box
                sx={{
                    width: size,
                    height: size,
                    bgcolor: "grey.100",
                    borderRadius: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <ImageIcon sx={{ fontSize: size / 3, color: "grey.400" }} />
            </Box>
        );
    }

    const shown = filled.slice(0, 4);

    return (
        <Box
            sx={{
                width: size,
                height: size,
                borderRadius: 1,
                overflow: "hidden",
                display: "grid",
                gridTemplateColumns: shown.length > 1 ? "1fr 1fr" : "1fr",
                gridTemplateRows: shown.length > 2 ? "1fr 1fr" : "1fr",
                gap: "2px",
                bgcolor: "grey.300",
            }}
        >
            {shown.map((item, i) => (
                <Box
                    key={item._id || i}
                    component="img"
                    src={item.imageFrontUrl}
                    alt={item.name || ""}
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
            ))}
        </Box>
    );
};

export default ItemCollage;
