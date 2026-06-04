import React, { useState } from "react";
import {
  Grid, Paper, TextField, Typography, Button, Stepper,
  Step, StepLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ImageIcon from "@mui/icons-material/Image";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CheckroomIcon from "@mui/icons-material/Checkroom";
import FavoriteIcon from "@mui/icons-material/Favorite";
import axios from "axios";
import { styled } from "@mui/system";

const steps = ["Choose Type", "Add Link", "Item Details", "Done"];

const categories = [
  { value: "Tops", label: "Tops" },
  { value: "Bottoms", label: "Bottoms" },
  { value: "Outerwear", label: "Outerwear" },
  { value: "Shoes", label: "Shoes" },
  { value: "Accessories", label: "Accessories" },
];

const seasons = [
  { value: "Any", label: "Any" },
  { value: "Spring", label: "Spring" },
  { value: "Summer", label: "Summer" },
  { value: "Fall", label: "Fall" },
  { value: "Winter", label: "Winter" },
];

const fits = [
  { value: "Standard", label: "Standard" },
  { value: "Slim", label: "Slim" },
  { value: "Loose", label: "Loose" },
  { value: "Baggy", label: "Baggy" },
  { value: "Oversized", label: "Oversized" },
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

const defaultItemData = {
  name: "",
  brand: "",
  category: "Tops",
  season: "Any",
  style: "",
  primary_color: "",
  secondary_color: "",
  fit: "Standard",
  image: "",
  price: "",
  link: "",
};

const AddItemComponent = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [itemType, setItemType] = useState(null); // "closet" or "wishlist"
  const [itemData, setItemData] = useState(defaultItemData);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [productUrl, setProductUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");

  // Confirmation dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);

  const handleInput = (e) => {
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

  const handleFetchUrl = async () => {
    if (!productUrl) return;
    setUrlLoading(true);
    setUrlError("");
    try {
      const response = await axios.post("/wishlist/create/url", { url: productUrl });
      setScrapedData(response.data);
      setConfirmOpen(true);
    } catch (error) {
      setUrlError("Could not find product data from this link. You can still fill in the details manually.");
    } finally {
      setUrlLoading(false);
    }
  };

  const handleConfirmProduct = () => {
    setItemData({
      ...defaultItemData,
      ...scrapedData,
    });
    if (scrapedData.image) {
      setPreviewUrl(scrapedData.image);
    }
    setConfirmOpen(false);
    setActiveStep(2);
  };

  const handleRejectProduct = () => {
    setConfirmOpen(false);
    setScrapedData(null);
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (itemData.image) {
        // Pass external image URL as a field if no file selected
        formData.append("imageUrl", itemData.image);
      }

      Object.keys(itemData).forEach((key) => {
        formData.append(key, itemData[key]);
      });

      const endpoint = itemType === "closet" ? "/closet/create" : "/wishlist/create";
      const response = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 201) {
        setActiveStep(3);
      }
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleAddAnother = () => {
    setActiveStep(0);
    setItemType(null);
    setItemData(defaultItemData);
    setPreviewUrl(null);
    setSelectedFile(null);
    setProductUrl("");
    setUrlError("");
    setScrapedData(null);
  };

  // ── Step 1: Choose Type ──
  const renderStep0 = () => (
    <Grid container direction="column" alignItems="center" gap={4} sx={{ padding: 6 }}>
      <Typography variant="h5">What would you like to add?</Typography>
      <Grid container direction="row" justifyContent="center" gap={4}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<CheckroomIcon />}
          sx={{ width: 200, height: 120, fontSize: 18, flexDirection: "column", gap: 1 }}
          onClick={() => { setItemType("closet"); setActiveStep(1); }}
        >
          Closet
        </Button>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          startIcon={<FavoriteIcon />}
          sx={{ width: 200, height: 120, fontSize: 18, flexDirection: "column", gap: 1 }}
          onClick={() => { setItemType("wishlist"); setActiveStep(1); }}
        >
          Wishlist
        </Button>
      </Grid>
    </Grid>
  );

  // ── Step 2: Add Link ──
  const renderStep1 = () => (
    <Grid container direction="column" alignItems="center" gap={4} sx={{ padding: 6 }}>
      <Typography variant="h5">Got a product link?</Typography>
      <Typography variant="body1" color="text.secondary">
        Paste a link to autofill item details, or skip to fill them in manually.
      </Typography>
      <Grid container direction="row" gap={2} justifyContent="center" alignItems="center">
        <TextField
          label="Product URL"
          variant="outlined"
          sx={{ width: 400 }}
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          error={!!urlError}
          helperText={urlError}
        />
        <Button
          variant="contained"
          onClick={handleFetchUrl}
          disabled={urlLoading || !productUrl}
        >
          {urlLoading ? <CircularProgress size={24} /> : "Fetch"}
        </Button>
      </Grid>
      <Button variant="text" onClick={() => setActiveStep(2)}>
        Skip, fill in manually
      </Button>
    </Grid>
  );

  // ── Step 3: Item Details ──
  const renderStep2 = () => (
    <Grid container direction="column" alignItems="center" gap={3} sx={{ padding: 4 }}>
      <Typography variant="h5">Item Details</Typography>
      <Grid container direction="row" gap={3} justifyContent="center">

        {/* Image Upload */}
        <Grid item>
          <Grid item>
            {previewUrl ? (
              <img src={previewUrl} width="300" height="300" alt="preview" style={{ objectFit: "cover", borderRadius: 8 }} />
            ) : (
              <ImageIcon style={{ fontSize: 300 }} />
            )}
          </Grid>
          <Grid container direction="row" gap={2} justifyContent="center" sx={{ marginTop: 1 }}>
            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
              Upload
              <VisuallyHiddenInput type="file" accept="image/*" onChange={handleImageChange} />
            </Button>
            <Button color="error" variant="contained" startIcon={<DeleteIcon />} onClick={removeImage}>
              Remove
            </Button>
          </Grid>
        </Grid>

        {/* Fields */}
        <Grid item>
          <Grid container direction="row" gap={3}>
            <Grid container direction="column" gap={2} sx={{ width: 225 }}>
              <TextField label="Name" variant="outlined" required name="name" value={itemData.name} onChange={handleInput} InputLabelProps={{ shrink: true }} />
              <TextField label="Brand" variant="outlined" name="brand" value={itemData.brand} onChange={handleInput} InputLabelProps={{ shrink: true }} />
              <TextField label="Category" variant="outlined" select name="category" value={itemData.category} onChange={handleInput} InputLabelProps={{ shrink: true }} slotProps={{ select: { native: true } }}>
                {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </TextField>
              <TextField label="Season" variant="outlined" select name="season" value={itemData.season} onChange={handleInput} InputLabelProps={{ shrink: true }} slotProps={{ select: { native: true } }}>
                {seasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </TextField>
            </Grid>
            <Grid container direction="column" gap={2} sx={{ width: 225 }}>
              <TextField label="Primary Color" variant="outlined" required name="primary_color" value={itemData.primary_color} onChange={handleInput} InputLabelProps={{ shrink: true }} />
              <TextField label="Secondary Color" variant="outlined" name="secondary_color" value={itemData.secondary_color} onChange={handleInput} InputLabelProps={{ shrink: true }} />
              <TextField label="Fit" variant="outlined" select name="fit" value={itemData.fit} onChange={handleInput} InputLabelProps={{ shrink: true }} slotProps={{ select: { native: true } }}>
                {fits.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </TextField>
              <TextField label="Style" variant="outlined" name="style" value={itemData.style} onChange={handleInput} InputLabelProps={{ shrink: true }} />
              {itemType === "wishlist" && (
                <>
                  <TextField label="Price" variant="outlined" name="price" value={itemData.price} onChange={handleInput} InputLabelProps={{ shrink: true }} />
                  <TextField label="Product Link" variant="outlined" name="link" value={itemData.link} onChange={handleInput} InputLabelProps={{ shrink: true }} />
                </>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      <Grid container direction="row" justifyContent="center" gap={2}>
        <Button variant="outlined" onClick={() => setActiveStep(1)}>Back</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </Grid>
    </Grid>
  );

  // ── Step 4: Success ──
  const renderStep3 = () => (
    <Grid container direction="column" alignItems="center" gap={4} sx={{ padding: 6 }}>
      <CelebrationIcon sx={{ fontSize: 120, color: "primary.main" }} />
      <Typography variant="h4">Item Added!</Typography>
      <Typography variant="body1" color="text.secondary">
        Your item has been added to your {itemType === "closet" ? "closet" : "wishlist"}.
      </Typography>
      <Grid container direction="row" justifyContent="center" gap={3}>
        <Button variant="outlined" onClick={handleAddAnother}>Add Another Item</Button>
        <Button variant="contained" onClick={() => navigate("/pages/home")}>Go Home</Button>
      </Grid>
    </Grid>
  );

  const renderStep = () => {
    switch (activeStep) {
      case 0: return renderStep0();
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return null;
    }
  };

  return (
    <React.Fragment>
      <Grid container alignContent="center" justifyContent="center" style={{ paddingTop: "50px" }}>
        <Paper elevation={3} style={{ width: 1100, minHeight: 500 }}>
          <Grid container direction="column">

            {/* Stepper */}
            <Grid item sx={{ padding: 4 }}>
              <Stepper activeStep={activeStep}>
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Grid>

            {/* Step Content */}
            <Grid item>
              {renderStep()}
            </Grid>

          </Grid>
        </Paper>
      </Grid>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={handleRejectProduct}>
        <DialogTitle>Does this look right?</DialogTitle>
        <DialogContent>
          <Grid container direction="column" alignItems="center" gap={2}>
            {scrapedData?.image && (
              <img src={scrapedData.image} alt={scrapedData.name} width="200" height="200" style={{ objectFit: "cover", borderRadius: 8 }} />
            )}
            <Typography variant="h6">{scrapedData?.name}</Typography>
            {scrapedData?.brand && (
              <Typography variant="body1" color="text.secondary">{scrapedData.brand}</Typography>
            )}
            {scrapedData?.price && (
              <Typography variant="body1" color="text.secondary">£{scrapedData.price}</Typography>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectProduct} color="error">No, try again</Button>
          <Button onClick={handleConfirmProduct} variant="contained">Yes, looks good!</Button>
        </DialogActions>
      </Dialog>

    </React.Fragment>
  );
};

export default AddItemComponent;