import React, { useEffect, useState } from "react";
import {
  Grid, Paper, TextField, Typography, Button, Stepper,
  Step, StepLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Box, Chip
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CelebrationIcon from "@mui/icons-material/Celebration";
import ClosetIcon from "@mui/icons-material/Checkroom";
import WishlistIcon from "@mui/icons-material/Favorite";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import axios from "axios";
import { usePreferences, formatPrice } from "../profile";
import PriceField from "./PriceField";
import { normalizeLink } from "../linkInput";
import { SERIF, monoLabel } from "../theme";
import ImageSlot, { useCutout } from "./ImageSlot";
import { preloadCutoutModel, saveCutout } from "../imageCleanup";

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

const fitOptions = [
  { value: "Standard", label: "Standard" },
  { value: "Slim", label: "Slim" },
  { value: "Loose", label: "Loose" },
  { value: "Boxy", label: "Boxy" },
  { value: "Baggy", label: "Baggy" },
  { value: "Oversized", label: "Oversized" },
];

const defaultItemData = {
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
  currency: "", // blank until chosen: falls back to the user's currency
  link: "",
};

const AddItemComponent = () => {
  const { currency } = usePreferences();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [itemType, setItemType] = useState(null);
  const [itemData, setItemData] = useState(defaultItemData);

  // Manual file uploads
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  // Background removal, on by default; runs as soon as a photo is chosen
  const [removeBgFront, setRemoveBgFront] = useState(true);
  const [removeBgBack, setRemoveBgBack] = useState(true);
  const frontCutout = useCutout(frontFile || itemData.imageFront || null, removeBgFront);
  const backCutout = useCutout(backFile || itemData.imageBack || null, removeBgBack);
  const [saving, setSaving] = useState(false);
  const [cleanupWarning, setCleanupWarning] = useState("");

  // Scraped data
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [scrapedData, setScrapedData] = useState(null);
  const [scrapedImages, setScrapedImages] = useState([]);

  // Fetch the cutout model while the user fills in details
  useEffect(() => {
    if (activeStep === 2) preloadCutoutModel();
  }, [activeStep]);

  // Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Image picker dialog
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState(null); // "front" or "back"

  const handleInput = (e) => {
    const { name, value } = e.target;
    setItemData({ ...itemData, [name]: value });
  };

  // Manual image upload handlers
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

  // Step 1 — Choose type
  const handleChooseType = (type) => {
    setItemType(type);
    setActiveStep(1);
  };

  // Step 2 — Fetch from URL
  const handleFetchUrl = async () => {
    // Check the link here first for instant feedback; the server checks again
    const { url: link, error: linkError } = normalizeLink(url);
    if (linkError) {
      setUrlError(linkError);
      return;
    }
    setUrl(link);
    setUrlLoading(true);
    setUrlError("");
    try {
      const response = await axios.post("/wishlist/create/url", { url: link });
      setScrapedData(response.data);
      setScrapedImages(response.data.images || []);
      setConfirmOpen(true);
    } catch (error) {
      // The server explains rejected links and pages it couldn't read
      setUrlError(
        error.response?.data?.error ||
        "Couldn't reach that page. Check your connection, or skip this and fill in the details yourself."
      );
    } finally {
      setUrlLoading(false);
    }
  };
  const handleConfirmScraped = () => {
    setItemData({
      ...defaultItemData,
      ...scrapedData,
      category: scrapedData.category || "Tops",
      season: scrapedData.season || "Any",
      fit: scrapedData.fit || "Standard",
    });
    // Set previews from suggested front/back
    if (scrapedData.imageFront) setFrontPreview(scrapedData.imageFront);
    if (scrapedData.imageBack) setBackPreview(scrapedData.imageBack);
    setConfirmOpen(false);
    setActiveStep(2);
  };

  const handleRejectScraped = () => {
    setConfirmOpen(false);
  };

  const handleSkipUrl = () => {
    setActiveStep(2);
  };

  // Image picker
  const openImagePicker = (side) => {
    setPickingFor(side);
    setImagePickerOpen(true);
  };

  const handlePickImage = (img) => {
    if (pickingFor === "front") {
      setFrontPreview(img.src);
      setFrontFile(null);
      setItemData((prev) => ({ ...prev, imageFront: img.src }));
    } else {
      setBackPreview(img.src);
      setBackFile(null);
      setItemData((prev) => ({ ...prev, imageBack: img.src }));
    }
    setImagePickerOpen(false);
  };

  // Step 3 — Save item
  const handleSave = async () => {
    setSaving(true);
    setCleanupWarning("");
    try {
      const formData = new FormData();

      // Append front image
      if (frontFile) {
        formData.append("imageFront", frontFile);
      } else if (itemData.imageFront) {
        formData.append("imageFrontUrl", itemData.imageFront);
      }

      // Append back image
      if (backFile) {
        formData.append("imageBack", backFile);
      } else if (itemData.imageBack) {
        formData.append("imageBackUrl", itemData.imageBack);
      }

      // Append all other fields except imageFront and imageBack
      Object.keys(itemData).forEach((key) => {
        if (key !== "imageFront" && key !== "imageBack" && key !== "images") {
          formData.append(key, itemData[key]);
        }
      });
      formData.set("currency", itemData.currency || currency);

      const endpoint = itemType === "closet" ? "/closet/create" : "/wishlist/create";
      const response = await axios.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 201) {
        // The item is saved with the original photos; now swap in the cutouts
        // (the server keeps the originals so they can be restored later)
        const sides = [
          { side: "front", hasPhoto: frontFile || itemData.imageFront, removeBg: removeBgFront, cutout: frontCutout },
          { side: "back", hasPhoto: backFile || itemData.imageBack, removeBg: removeBgBack, cutout: backCutout },
        ];
        let failed = 0;
        for (const { side, hasPhoto, removeBg, cutout } of sides) {
          if (!hasPhoto || !removeBg) continue;
          const blob = await cutout.result();
          if (!blob) {
            failed++;
            continue;
          }
          try {
            await saveCutout(itemType, response.data._id, side, blob);
          } catch (e) {
            console.log(e);
            failed++;
          }
        }
        if (failed) {
          setCleanupWarning(
            `The background couldn't be removed from ${failed === 1 ? "one photo" : "both photos"}, so the original was kept. You can try again from the item's edit page.`
          );
        }
        setActiveStep(3);
      }
    } catch (error) {
      console.error("Error saving item:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAnother = () => {
    setActiveStep(0);
    setRemoveBgFront(true);
    setRemoveBgBack(true);
    setCleanupWarning("");
    setItemType(null);
    setItemData(defaultItemData);
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview(null);
    setBackPreview(null);
    setUrl("");
    setUrlError("");
    setScrapedData(null);
    setScrapedImages([]);
  };

  return (
    <Grid container alignContent="center" justifyContent="center" style={{ paddingTop: "50px" }}>
      <Paper elevation={3} style={{ width: 1100, padding: "40px" }}>

        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ marginBottom: 5 }}>
          {steps.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {/* Step 1 — Choose Type */}
        {activeStep === 0 && (
          <Grid container direction="column" alignItems="center" gap={4}>
            <Typography variant="h5">What would you like to add?</Typography>
            <Grid container justifyContent="center" gap={4}>
              <Button
                variant="contained" color="primary" size="large"
                startIcon={<ClosetIcon />}
                onClick={() => handleChooseType("closet")}
                sx={{ width: 200, height: 100, fontSize: "1.1rem" }}
              >
                Closet
              </Button>
              <Button
                variant="contained" color="secondary" size="large"
                startIcon={<WishlistIcon />}
                onClick={() => handleChooseType("wishlist")}
                sx={{ width: 200, height: 100, fontSize: "1.1rem" }}
              >
                Wishlist
              </Button>
            </Grid>
          </Grid>
        )}

        {/* Step 2 — Add Link */}
        {activeStep === 1 && (
          <Grid container direction="column" alignItems="center" gap={4}>
            <Typography variant="h5">Got a product link?</Typography>
            <Typography variant="body1" color="text.secondary">
              Paste a link to autofill item details, or skip to fill them in manually.
            </Typography>
            <Grid container justifyContent="center" gap={2} alignItems="center">
              <TextField
                label="Product URL" variant="outlined" sx={{ width: 500, maxWidth: "100%" }}
                placeholder="https://store.com/products/linen-shirt"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim() && !urlLoading) handleFetchUrl();
                }}
                inputProps={{ inputMode: "url", autoComplete: "off", spellCheck: false }}
                error={!!urlError} helperText={urlError}
              />
              <Button
                variant="contained" color="primary"
                onClick={handleFetchUrl} disabled={!url.trim() || urlLoading}
              >
                {urlLoading ? <CircularProgress size={24} /> : "Fetch"}
              </Button>
            </Grid>
            <Button variant="text" color="secondary" onClick={handleSkipUrl}>Skip</Button>
          </Grid>
        )}

        {/* Step 3 — Item Details */}
        {activeStep === 2 && (
          <Grid container direction="column" alignItems="center" gap={3}>

            {/* Image Upload Row */}
            <Grid container direction="row" justifyContent="center" gap={6}>
              <ImageSlot
                label="Front"
                previewSrc={frontPreview}
                cutout={frontCutout}
                removeBg={removeBgFront}
                onToggleRemoveBg={setRemoveBgFront}
                onFileChange={handleFrontFileChange}
                onRemove={removeFrontImage}
                extraActions={scrapedImages.length > 0 && (
                  <Button size="small" onClick={() => openImagePicker("front")}>Pick from link</Button>
                )}
              />
              <ImageSlot
                label="Back"
                previewSrc={backPreview}
                cutout={backCutout}
                removeBg={removeBgBack}
                onToggleRemoveBg={setRemoveBgBack}
                onFileChange={handleBackFileChange}
                onRemove={removeBackImage}
                extraActions={scrapedImages.length > 0 && (
                  <Button size="small" onClick={() => openImagePicker("back")}>Pick from link</Button>
                )}
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
                  {categories.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </TextField>
                <TextField
                  label="Season" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.season} name="season" onChange={handleInput}
                >
                  {seasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </TextField>
                {itemType === "wishlist" && (
                  <PriceField
                    price={itemData.price}
                    currency={itemData.currency || currency}
                    onPriceChange={handleInput}
                    onCurrencyChange={(code) => setItemData((prev) => ({ ...prev, currency: code }))}
                  />
                )}
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
                  {fitOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </TextField>
                <TextField
                  label="Style" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.style} name="style" onChange={handleInput}
                />
                {itemType === "wishlist" && (
                  <TextField
                    label="Product Link" variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    value={itemData.link} name="link" onChange={handleInput}
                  />
                )}
              </Grid>
            </Grid>

            <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Grid>
        )}

        {/* Step 4 — Success */}
        {activeStep === 3 && (
          <Grid container direction="column" alignItems="center" gap={4}>
            <CelebrationIcon sx={{ fontSize: 150, color: "primary.main" }} />
            <Typography variant="h4">Item added successfully!</Typography>
            {cleanupWarning && (
              <Typography variant="body2" color="error.main" sx={{ maxWidth: 520, textAlign: "center" }}>
                {cleanupWarning}
              </Typography>
            )}
            <Typography variant="body1" color="text.secondary">
              What would you like to do next?
            </Typography>
            <Grid container justifyContent="center" gap={3}>
              <Button variant="contained" color="primary" onClick={handleAddAnother}>
                Add Another Item
              </Button>
              <Button variant="outlined" color="primary" onClick={() => navigate("/pages/home")}>
                Return Home
              </Button>
            </Grid>
          </Grid>
        )}

      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={handleRejectScraped}>
        <DialogTitle>Does this look right?</DialogTitle>
        <DialogContent>
          {/* Clamped so odd store data can never stretch the dialog */}
          <Grid container direction="column" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
            {scrapedData?.imageFront && (
              <Box
                component="img"
                src={scrapedData.imageFront}
                alt={scrapedData?.name}
                sx={{ width: 200, aspectRatio: "3 / 4", objectFit: "contain", bgcolor: "grey.100", mb: 1 }}
              />
            )}
            {scrapedData?.brand && (
              <Typography noWrap sx={{ ...monoLabel, color: "text.secondary", maxWidth: 360 }}>{scrapedData.brand}</Typography>
            )}
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 22,
                lineHeight: 1.25,
                textAlign: "center",
                maxWidth: 360,
                overflowWrap: "anywhere",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {scrapedData?.name}
            </Typography>
            {scrapedData?.price && (
              <Typography sx={{ ...monoLabel, color: "primary.main" }}>
                {formatPrice(scrapedData.price, scrapedData.currency || currency)}
              </Typography>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectScraped} color="error">No, try again</Button>
          <Button onClick={handleConfirmScraped} variant="contained" color="primary">Yes, looks good!</Button>
        </DialogActions>
      </Dialog>

      {/* Image Picker Dialog */}
      <Dialog open={imagePickerOpen} onClose={() => setImagePickerOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Select {pickingFor === "front" ? "Front" : "Back"} Image
        </DialogTitle>
        <DialogContent>
          <Grid container gap={2} justifyContent="center" sx={{ paddingTop: 1 }}>
            {scrapedImages.map((img, index) => {
              const isSelectedFront = img.src === itemData.imageFront;
              const isSelectedBack = img.src === itemData.imageBack;
              return (
                <Box
                  key={index}
                  onClick={() => handlePickImage(img)}
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                    borderRadius: 2,
                    overflow: "hidden",
                    border: isSelectedFront || isSelectedBack ? "3px solid" : "3px solid transparent",
                    borderColor: isSelectedFront ? "primary.main" : isSelectedBack ? "secondary.main" : "transparent",
                    "&:hover": { opacity: 0.85 },
                  }}
                >
                  <img
                    src={img.src}
                    alt={img.alt || `Product image ${index + 1}`}
                    width="150"
                    height="150"
                    style={{ objectFit: "cover", display: "block" }}
                  />
                  {/* Show front/back label if already selected */}
                  {isSelectedFront && (
                    <Chip label="Front" color="primary" size="small" icon={<CheckCircleIcon />}
                      sx={{ position: "absolute", bottom: 4, left: 4 }} />
                  )}
                  {isSelectedBack && (
                    <Chip label="Back" color="secondary" size="small" icon={<CheckCircleIcon />}
                      sx={{ position: "absolute", bottom: 4, left: 4 }} />
                  )}
                  {img.alt && (
                    <Typography variant="caption" sx={{ display: "block", textAlign: "center", padding: "2px 4px", bgcolor: "rgba(0,0,0,0.5)", color: "white" }}>
                      {img.alt}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImagePickerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

    </Grid>
  );
};

export default AddItemComponent;