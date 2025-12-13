import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardMedia from "@mui/material/CardMedia";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack"
import CardActions from "@mui/material/CardActions";
import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import axios from "axios";

const ItemCard = (props) => {
    const [item, setItem] = useState(props.item);

    const navigate = useNavigate();

    const handleUpdate = (id) => {
        navigate("/closet/update/" + id);
    };

    const handleDelete = async (id) => {
        try {
            const response = await axios.delete("/closet/delete/" + id);
            console.log(response.data);
            if (response.data === 200) {
                console.log("Item deleted successfully");
                props.getItem();
            }
        } catch (e) {
        console.log(e);
        }
    };

    return (
        <React.Fragment>
        <Card
            variant="outlined"
            sx={{
            width: 750,
            height: 400,
            display: "flex",
            justifyContent: "flex-start",
            flexDirection: "column",
            }}
        >
            <CardHeader title={item.name} />
            <CardContent>
            <Stack direction="column" spacing={1}>
                <Typography variant="body1" color="text.primary">
                {item.brand}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Category: {item.category}
                </Typography>
                <Stack direction="column" spacing={2}>
                <Typography variant="body1" color="text.secondary">
                    Season: {item.season}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Style: {item.style}
                </Typography>
                </Stack>
                <Stack direction="column" spacing={2}>
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
            </Stack>
            </CardContent>

            <CardActions>
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
                    onClick={() => handleDelete(item._id)}
                    >
                    Delete
                    </Button>
                </Stack>
            </CardActions>

        </Card>
        </React.Fragment>
    );
};

export default ItemCard;