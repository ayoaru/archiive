import React, { useState, useEffect } from "react";
import { Grid, Paper, TextField, Typography, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ImageIcon from '@mui/icons-material/Image';
import axios from "axios";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { styled } from '@mui/system';

const categories = [
  { value: "Tops", label: "Tops" },
  { value: "Bottoms", label: "Bottoms" },
  { value: "Outerwear", label: "Outerwear" },
  { value: "Shoes", label: "Shoes" },
  { value: "Accessories", label: "Accessories" }
];

const seasons = [
  { value: "Any", label: "Any" },
  { value: "Spring", label: "Spring" },
  { value: "Summer", label: "Summer" },
  { value: "Fall", label: "Fall" },
  { value: "Winter", label: "Winter" }
];

const fit = [
  { value: "Standard", label: "Standard" },
  { value: "Slim", label: "Slim" },
  { value: "Loose", label: "Loose" },
  { value: "Baggy", label: "Baggy" },
  { value: "Oversized", label: "Oversized" }
];

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const UpdateItemComponent = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [itemData, setItemData] = useState({
    name: "",
    brand: "",
    category: "Tops",
    season: "Any",
    style: "",
    primary_color: "",
    secondary_color: "",
    fit: "Standard",
    image: ""
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch existing item data on load
  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await axios.get(`/closet/get/${id}`);
        const item = response.data;
        setItemData({
          name: item.name || "",
          brand: item.brand || "",
          category: item.category || "Tops",
          season: item.season || "Any",
          style: item.style || "",
          primary_color: item.primary_color || "",
          secondary_color: item.secondary_color || "",
          fit: item.fit || "Standard",
          image: item.image || ""
        });
        // Prepopulate image preview with existing image
        if (item.imageUrl) {
          setPreviewUrl(item.imageUrl);
        }
      } catch (error) {
        console.error("Error fetching item:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleClosetInput = (e) => {
    const { name, value } = e.target;
    setItemData({ ...itemData, [name]: value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setItemData({ ...itemData, image: "" });
  };

  const updateItem = async () => {
    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      Object.keys(itemData).forEach((key) => {
        formData.append(key, itemData[key]);
      });

      const response = await axios.put(`/closet/update/${id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.status === 200) {
        console.log("Item updated successfully");
        navigate("/pages/home");
      }
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  if (loading) return <Typography sx={{ padding: 4 }}>Loading...</Typography>;

  return (
    <React.Fragment>
      <Grid
        container
        alignContent="center"
        justifyContent="center"
        style={{ paddingTop: "50px" }}
      >
        <Paper elevation={3} style={{ width: 1100 }}>
          <Grid container direction="column" alignItems="center" gap={3}>
            <br />

            <Grid item>
              <Grid container direction="row" gap={3}>

                {/* Image Upload */}
                <Grid item>
                  <Grid item>
                    {previewUrl ? (
                      <img src={previewUrl} width="400" height="400" alt="preview" style={{ objectFit: "cover" }} />
                    ) : (
                      <ImageIcon style={{ fontSize: 400 }} />
                    )}
                  </Grid>
                  <Grid item>
                    <Grid container direction="row" gap={2} justifyContent="center">
                      <Button
                        component="label"
                        role={undefined}
                        color="primary"
                        variant="contained"
                        startIcon={<CloudUploadIcon />}
                      >
                        Upload
                        <VisuallyHiddenInput
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </Button>
                      <Button
                        color="error"
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        onClick={removeImage}
                      >
                        Remove
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Item Details */}
                <Grid item>
                  <Grid item padding={3}>
                    <Typography variant="h5">Item Details</Typography>
                  </Grid>

                  <Grid item>
                    <Grid container direction="row" gap={3} padding={3}>
                      <Grid item>
                        <Grid container direction="column" gap={2}>
                          <Grid item>
                            <TextField
                              label="Name"
                              variant="outlined"
                              required
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              value={itemData.name}
                              name="name"
                              onChange={handleClosetInput}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              label="Brand"
                              variant="outlined"
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              value={itemData.brand}
                              name="brand"
                              onChange={handleClosetInput}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              label="Category"
                              variant="outlined"
                              sx={{ width: 225 }}
                              select
                              InputLabelProps={{ shrink: true }}
                              slotProps={{ select: { native: true } }}
                              value={itemData.category}
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
                              sx={{ width: 225 }}
                              select
                              InputLabelProps={{ shrink: true }}
                              slotProps={{ select: { native: true } }}
                              value={itemData.season}
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
                        </Grid>
                      </Grid>

                      <Grid item>
                        <Grid container direction="column" gap={2}>
                          <Grid item>
                            <TextField
                              label="Primary Color"
                              variant="outlined"
                              required
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              value={itemData.primary_color}
                              name="primary_color"
                              onChange={handleClosetInput}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              label="Secondary Color"
                              variant="outlined"
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              value={itemData.secondary_color}
                              name="secondary_color"
                              onChange={handleClosetInput}
                            />
                          </Grid>
                          <Grid item>
                            <TextField
                              label="Fit"
                              variant="outlined"
                              select
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              slotProps={{ select: { native: true } }}
                              value={itemData.fit}
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
                              label="Style"
                              variant="outlined"
                              sx={{ width: 225 }}
                              InputLabelProps={{ shrink: true }}
                              value={itemData.style}
                              name="style"
                              onChange={handleClosetInput}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

              </Grid>
            </Grid>

            <Grid item>
              <Button variant="contained" color="primary" onClick={updateItem}>
                Update
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