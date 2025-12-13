import React, { useEffect, useState } from "react";
import { Grid, Paper, TextField, Typography, Button, Box } from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const categories = [
  {
    value: "Tops",
    label: "Tops",
  },
  {
    value: "Bottoms",
    label: "Bottoms",
  },
  {
    value: "Outerwear",
    label: "Outerwear",
  },
  {
    value: "Shoes",
    label: "Shoes",
  },
  {
    value: "Accessories",
    label: "Accessories",
  }
];

const seasons = [
  
  {
    value: "Any",
    label: "Any",
  },
  {
    value: "Spring",
    label: "Spring",
  },
  {
    value: "Summer",
    label: "Summer",
  },
  {
    value: "Fall",
    label: "Fall",
  },
  {
    value: "Winter",
    label: "Winter",
  }
];

const fit = [
  {
    value: "Standard",
    label: "Standard",
  },
  {
    value: "Slim",
    label: "Slim",
  },
  {
    value: "Loose",
    label: "Loose",
  },
  {
    value: "Baggy",
    label: "Baggy",
  },
  {
    value: "Oversized",
    label: "Oversized",
  }

];

const UpdateItemComponent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [itemData, setItemData] =useState({});

    useEffect(() => {
        getItem();
    }, []);

    const getItem = async () => {
        try {
            const response = await axios.get(`/closet/item/${id}`);
            if (response.status === 200) {
                setItemData(response.data);
            }
        } catch (error) {
            console.error("Error fetching item data:", error);
        }
    };

    const handleClosetInput = (e) => {
        const { name, value } = e.target;
        setItemData({...itemData, [name]: value });
    };

    const updateCloset = async () => {
        console.log("Saving item:", itemData);
        try {
            const response = await axios.put("/closet/update" + id, {
                data: itemData,
            });
            if (response.status === 200) {
                console.log("Item updated successfully:", response.data);
                navigate("/pages/home");
            }
        } catch (error) {
            console.error("Error saving item:", error);
        }
    };

    
    return (
    <React.Fragment>
      <Grid
        container
        alignContent="center"
        justifyContent="center"
        style={{ paddingTop: "50px" }}
      >
        <Paper
          elevation={3}
          style={{
            width: 550,
          }}
        >
          <Grid
            //sx={gridStyle}
            container
            direction="column"
            alignItems="center"
            gap={3}
          >
            <br />
            <Grid item>
              <Typography variant="h5">Update Existing Closet Item</Typography>
            </Grid>

            <Grid item>
              <Grid container direction="row" gap={3}>
                <Grid item>
                  <Grid container direction="column" gap={2}>
                    <Grid item>
                      <TextField
                        label="Name"
                        variant="outlined"
                        required ={true}
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={itemData.name || ""}
                        name="name"
                        onChange={handleClosetInput}
                      />
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Brand"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={itemData.brand || ""}
                        name="brand"
                        onChange={handleClosetInput}
                      />
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Category"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        select
                        InputLabelProps={{
                          shrink: true,
                        }}
                        slotProps={{
                          select: {
                            native: true,
                          },
                        }}
                        value={itemData.category || ""}
                        name="category"
                        onChange={handleClosetInput}
                      >
                        {categories.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Season"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        select
                        InputLabelProps={{
                          shrink: true,
                        }}
                        slotProps={{
                          select: {
                            native: true,
                          },
                        }}
                        value={itemData.season || ""}
                        name="season"
                        onChange={handleClosetInput}
                      >
                        {seasons.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Style"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        type="number"
                        value={itemData.style}
                        name="style"
                        onChange={handleClosetInput}
                      />
                    </Grid>
                  </Grid>
                </Grid>

                <Grid item>
                  <Grid container direction="column" gap={2}>
                    <Grid item>
                      <TextField
                        label="Primary Color"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={itemData.primary_color || ""}
                        name="primary_color"
                        onChange={handleClosetInput}
                      />
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Secondary Color"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={itemData.secondary_color || ""}
                        name="secondary_color"
                        onChange={handleClosetInput}
                      />
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Fit"
                        variant="outlined"
                        select
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        slotProps={{
                          select: {
                            native: true,
                          },
                        }}
                        value={itemData.fit || ""}
                        name="fit"
                        onChange={handleClosetInput}
                      >
                        {fit.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid item>
                      <TextField
                        label="Image URL"
                        variant="outlined"
                        sx = {{ width: 225 }}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        value={itemData.image || ""}
                        name="image"
                        onChange={handleClosetInput}
                      />
                    </Grid>

                    
                  </Grid>
                </Grid>
              </Grid>
            </Grid>

            <Grid item>
              <Button variant="contained" color="primary" onClick={updateCloset}>
                Save
              </Button>
            </Grid>
            <Grid item></Grid>
          </Grid>
        </Paper>
      </Grid>
    </React.Fragment>
  );
};

export default UpdateItemComponent;