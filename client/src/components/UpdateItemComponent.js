import React, { useState, useEffect } from "react";
import { Grid, Paper, TextField, Typography, Button } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ImageSlot, { useCutout } from "./ImageSlot";
import { preloadCutoutModel, restoreOriginal, saveCutout } from "../imageCleanup";

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
  { value: "Boxy", label: "Boxy" },
  { value: "Baggy", label: "Baggy" },
  { value: "Oversized", label: "Oversized" }
];

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
    imageFront: "",
    imageBack: "",
  });

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Background removal. `originals` holds the untouched photos' URLs for sides
  // that are currently saved as cutouts; the switch starts on for those.
  const [originals, setOriginals] = useState({ front: "", back: "" });
  const [removeBgFront, setRemoveBgFront] = useState(false);
  const [removeBgBack, setRemoveBgBack] = useState(false);

  // A side is "already clean" while its saved cutout is left untouched
  const frontAlreadyClean = Boolean(originals.front) && !frontFile && itemData.imageFront !== "";
  const backAlreadyClean = Boolean(originals.back) && !backFile && itemData.imageBack !== "";
  const frontCutout = useCutout(
    frontAlreadyClean ? null : frontFile || (itemData.imageFront ? frontPreview : null),
    removeBgFront
  );
  const backCutout = useCutout(
    backAlreadyClean ? null : backFile || (itemData.imageBack ? backPreview : null),
    removeBgBack
  );

  useEffect(() => {
    preloadCutoutModel();
  }, []);

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
          imageFront: item.imageFront || "",
          imageBack: item.imageBack || "",
        });
        if (item.imageFrontUrl) setFrontPreview(item.imageFrontUrl);
        setOriginals({ front: item.imageFrontOriginalUrl || "", back: item.imageBackOriginalUrl || "" });
        setRemoveBgFront(Boolean(item.imageFrontOriginal));
        setRemoveBgBack(Boolean(item.imageBackOriginal));
        if (item.imageBackUrl) setBackPreview(item.imageBackUrl);
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

  const handleFrontFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setRemoveBgFront(true);
      setFrontPreview(URL.createObjectURL(file));
      setItemData({ ...itemData, imageFront: "" });
    }
  };

  const handleBackFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setRemoveBgBack(true);
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
    setSaving(true);
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

      const response = await axios.put(`/closet/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 200) {
        // Then apply the cutout switches: save new cutouts, or restore an original
        const sides = [
          { side: "front", hasPhoto: frontFile || itemData.imageFront !== "", removeBg: removeBgFront, alreadyClean: frontAlreadyClean, cutout: frontCutout },
          { side: "back", hasPhoto: backFile || itemData.imageBack !== "", removeBg: removeBgBack, alreadyClean: backAlreadyClean, cutout: backCutout },
        ];
        for (const { side, hasPhoto, removeBg, alreadyClean, cutout } of sides) {
          if (!hasPhoto) continue;
          try {
            if (alreadyClean) {
              if (!removeBg) await restoreOriginal("closet", id, side);
            } else if (removeBg) {
              const blob = await cutout.result();
              if (blob) await saveCutout("closet", id, side, blob);
            }
          } catch (e) {
            // The item itself saved; it just keeps its current photo
            console.log(e);
          }
        }
        navigate("/pages/closet");
      }
    } catch (error) {
      console.error("Error updating closet item:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Typography sx={{ padding: 4 }}>Loading...</Typography>;

  return (
    <React.Fragment>
      <Grid container alignContent="center" justifyContent="center" style={{ paddingTop: "50px" }}>
        <Paper elevation={3} style={{ width: 1100, padding: "40px" }}>
          <Grid container direction="column" alignItems="center" gap={3}>

            <Typography variant="h5">Update Item</Typography>

            {/* Image Upload Row */}
            <Grid container direction="row" justifyContent="center" gap={6}>
              <ImageSlot
                label="Front"
                previewSrc={frontAlreadyClean && !removeBgFront ? originals.front : frontPreview}
                cutout={frontCutout}
                removeBg={removeBgFront}
                onToggleRemoveBg={setRemoveBgFront}
                onFileChange={handleFrontFileChange}
                onRemove={removeFrontImage}
              />
              <ImageSlot
                label="Back"
                previewSrc={backAlreadyClean && !removeBgBack ? originals.back : backPreview}
                cutout={backCutout}
                removeBg={removeBgBack}
                onToggleRemoveBg={setRemoveBgBack}
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
                  value={itemData.name} name="name" onChange={handleClosetInput}
                />
                <TextField
                  label="Brand" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.brand} name="brand" onChange={handleClosetInput}
                />
                <TextField
                  label="Category" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.category} name="category" onChange={handleClosetInput}
                >
                  {categories.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Season" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.season} name="season" onChange={handleClosetInput}
                >
                  {seasons.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
              </Grid>

              <Grid container direction="column" gap={2} sx={{ width: 225 }}>
                <TextField
                  label="Primary Color" variant="outlined" required
                  InputLabelProps={{ shrink: true }}
                  value={itemData.primary_color} name="primary_color" onChange={handleClosetInput}
                />
                <TextField
                  label="Secondary Color" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.secondary_color} name="secondary_color" onChange={handleClosetInput}
                />
                <TextField
                  label="Fit" variant="outlined" select
                  InputLabelProps={{ shrink: true }}
                  slotProps={{ select: { native: true } }}
                  value={itemData.fit} name="fit" onChange={handleClosetInput}
                >
                  {fit.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </TextField>
                <TextField
                  label="Style" variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={itemData.style} name="style" onChange={handleClosetInput}
                />
              </Grid>
            </Grid>

            <Button variant="contained" color="primary" onClick={updateItem} disabled={saving}>
              {saving ? "Saving…" : "Update"}
            </Button>

          </Grid>
        </Paper>
      </Grid>
    </React.Fragment>
  );
};

export default UpdateItemComponent;