import React, { useState, useEffect } from "react";
import { Grid, Paper, TextField, Typography, Button, Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import ImageIcon from "@mui/icons-material/Image";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { styled } from "@mui/system";
import axios from "axios";

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

const fitOptions = [
  { value: "Standard", label: "Standard" },
  { value: "Slim", label: "Slim" },
  { value: "Loose", label: "Loose" },
  { value: "Baggy", label: "Baggy" },
  { value: "Oversized", label: "Oversized" }
];

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const UpdateWishlistItemComponent = () => {
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
    imageFront: "",
    imageBack: "",
    price: "",
    link: "",
  });

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await axios.get(`/wishlist/get/${id}`);
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
          imageFront: item.imageFront || "",
          imageBack: item.imageBack || "",
          price: item.price || "",
          link: item.link || "",
        });
        if (item.imageFrontUrl) setFrontPreview(item.imageFrontUrl);
        if (item.imageBackUrl) setBackPreview(item.imageBackUrl);
      } catch (error) {
        console.error("Error fetching wishlist item:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setItemData({ ...itemData, [name]: value });
  };

  const handleFrontFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
      setItemData({ ...itemData, imageFront: "" });
    }
  };

  const handleBackFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
      setItemData({ ...itemData, imageBack: "" });
    }
  };

  const removeFrontImage = () => {
    if (frontPreview) URL.revokeObjectURL(frontPreview);
    setFrontFile(null);
    setFrontPreview(null);
    setItemData({ ...itemData, imageFront: "" });
  };

  const removeBackImage = () => {
    if (backPreview) URL.revokeObjectURL(backPreview);
    setBackFile(null);
    setBackPreview(null);
    setItemData({ ...itemData, imageBack: "" });
  };

  const updateItem = async () => {
    try {
      const formData = new FormData();

      if (frontFile) {
        formData.append("imageFront", frontFile);
      } else if (itemData.imageFront === "") {
        formData.append("imageFront", "");
      }

      if (backFile) {
        formData.append("imageBack", backFile);
      } else if (itemData.imageBack === "") {
        formData.append("imageBack", "");
      }

      Object.keys(itemData).forEach((key) => {
        if (key !== "imageFront" && key !== "imageBack") {
          formData.append(key, itemData[key]);
        }
      });

      const response = await axios.put(`/wishlist/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        navigate("/pages/wishlist");
      }
    } catch (error) {
      console.error("Error updating wishlist item:", error);
    }
  };

  const ImagePanel = ({ label, preview, onFileChange, onRemove }) => (
    <Grid container direction="column" alignItems="center" gap={1}>
      <Typography variant="subtitle1" fontWeight="bold">{label}</Typography>
      {preview ? (
        <img src={preview} width="200" height="200" alt={label} style={{ objectFit: "cover", borderRadius: 8 }} />
      ) : (
        <Box sx={{ width: 200, height: 200, bgcolor: "grey.100", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon sx={{ fontSize: 80, color: "grey.400" }} />
        </Box>
      )}
      <Grid container direction="row" gap={1} justifyContent="center">
        <Button component="label" variant="contained" color="primary" size="small" startIcon={<CloudUploadIcon />}>
          Upload
          <VisuallyHiddenInput type="file" accept="image/*" onChange={onFileChange} />
        </Button>
        <Button color="error" variant="contained" size="small" startIcon={<DeleteIcon />} onClick={onRemove}>
          Remove
        </Button>
      </Grid>
    </Grid>
  );

  if (loading) return <Typography sx={{ padding: 4 }}>Loading...</Typography>;

  return (
    <React.Fragment>
      <Grid container alignContent="center" justifyContent="center" style={{ paddingTop: "50px" }}>
        <Paper elevation={3} style={{ width: 1100, padding: "40px" }}>
          <Grid container direction="column" alignItems="center" gap={3}>

            <Typography variant="h5">Update Wishlist Item</Typography>

            {/* Image Upload Row */}
            <Grid container direction="row" justifyContent="center" gap={6}>
              <ImagePanel
                label="Front"
                preview={frontPreview}
                onFileChange={handleFrontFileChange}
                onRemove={removeFrontImage}
              />
              <ImagePanel
                label="Back"
                preview={backPreview}
                onFileChange={handleBackFileChange}
                onRemove={removeBackImage}
              />
            </Grid>

            {/* Item Details Form */}
            <Grid container direction="row" gap={3} justifyContent="center">
              <Grid container direction="column" gap={2} sx={{ width: 225 }}>
                <TextField
                  label="Name" variant="outlined" required
                  InputLabelProps={{ shrink: true }}
                  value={itemData.name} name="name" onChange={handleInput}
                />
                <TextField
                  label="Brand" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.brand} name="brand" onChange={handleInput}
                />
                <TextField
                  label="Category" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.category} name="category" onChange={handleInput}
                >
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Season" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.season} name="season" onChange={handleInput}
                >
                  {seasons.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Price" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.price} name="price" onChange={handleInput}
                />
              </Grid>

              <Grid container direction="column" gap={2} sx={{ width: 225 }}>
                <TextField
                  label="Primary Color" variant="outlined" required
                  InputLabelProps={{ shrink: true }}
                  value={itemData.primary_color} name="primary_color" onChange={handleInput}
                />
                <TextField
                  label="Secondary Color" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.secondary_color} name="secondary_color" onChange={handleInput}
                />
                <TextField
                  label="Fit" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.fit} name="fit" onChange={handleInput}
                >
                  {fitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Style" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.style} name="style" onChange={handleInput}
                />
                <TextField
                  label="Product Link" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.link} name="link" onChange={handleInput}
                />
              </Grid>
            </Grid>

            <Button variant="contained" color="primary" onClick={updateItem}>
              Update
            </Button>

          </Grid>
        </Paper>
      </Grid>
    </React.Fragment>
  );
};

export default UpdateWishlistItemComponent;