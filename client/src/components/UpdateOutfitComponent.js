import React, { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import ImageIcon from "@mui/icons-material/Image";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { styled } from "@mui/system";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import CollageEditor from "./CollageEditor";

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

// Top-tier -> second-tier tab mapping, backed by the existing closet item categories
const CATEGORY_TABS = {
    Clothing: ["Tops", "Bottoms", "Outerwear", "Shoes"],
    Accessories: ["Accessories"],
};

// The outfit base is derived from whatever's picked, not chosen explicitly:
// the first selected item of each of these categories fills that base slot.
const BASE_SLOT_BY_CATEGORY = { Tops: "top", Bottoms: "pants", Shoes: "shoes" };

const seasons = [
    { value: "Any", label: "Any" },
    { value: "Spring", label: "Spring" },
    { value: "Summer", label: "Summer" },
    { value: "Fall", label: "Fall" },
    { value: "Winter", label: "Winter" },
];

const UpdateOutfitComponent = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [season, setSeason] = useState("Any");
    const [occasion, setOccasion] = useState("");

    const [closetItems, setClosetItems] = useState([]);

    const [topTier, setTopTier] = useState("Clothing");
    const [subTier, setSubTier] = useState("Tops");

    const [selectedItems, setSelectedItems] = useState([]);

    const [existingPreviewImageUrl, setExistingPreviewImageUrl] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [previewFileUrl, setPreviewFileUrl] = useState(null);
    const [previewCleared, setPreviewCleared] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const collageRef = useRef(null);

    useEffect(() => {
        getClosetItems();
        getOutfit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const getClosetItems = async () => {
        try {
            const response = await axios.get("http://localhost:5000/closet/read");
            setClosetItems(response.data);
        } catch (e) {
            console.log(e);
        }
    };

    const getOutfit = async () => {
        try {
            const response = await axios.get(`/outfits/get/${id}`);
            const outfit = response.data;

            setName(outfit.name || "");
            setSeason(outfit.season || "Any");
            setOccasion(outfit.occasion || "");
            setSelectedItems(
                [outfit.base?.top, outfit.base?.pants, outfit.base?.shoes, ...(outfit.items || [])].filter(Boolean)
            );
            if (outfit.previewImageUrl) setExistingPreviewImageUrl(outfit.previewImageUrl);
        } catch (e) {
            console.log(e);
        } finally {
            setLoading(false);
        }
    };

    const handleTopTierChange = (event, newTopTier) => {
        setTopTier(newTopTier);
        setSubTier(CATEGORY_TABS[newTopTier][0]);
    };

    const gridItems = closetItems.filter((item) => item.category === subTier);

    // The base is just the first selected item in each of Tops/Bottoms/Shoes —
    // everything else selected (extra layers, accessories, extra tops, etc.) is an extra.
    const base = useMemo(() => {
        const result = { top: null, pants: null, shoes: null };
        for (const item of selectedItems) {
            const slot = BASE_SLOT_BY_CATEGORY[item.category];
            if (slot && !result[slot]) result[slot] = item;
        }
        return result;
    }, [selectedItems]);

    const baseIds = new Set([base.top?._id, base.pants?._id, base.shoes?._id].filter(Boolean));
    const extraItems = selectedItems.filter((item) => !baseIds.has(item._id));

    const baseLabelFor = (item) => {
        if (item._id === base.top?._id) return "Top";
        if (item._id === base.pants?._id) return "Pants";
        if (item._id === base.shoes?._id) return "Shoes";
        return null;
    };

    const isSelected = (item) => selectedItems.some((i) => i._id === item._id);

    const handleItemClick = (item) => {
        setSelectedItems((prev) =>
            prev.some((i) => i._id === item._id)
                ? prev.filter((i) => i._id !== item._id)
                : [...prev, item]
        );
    };

    const handlePreviewFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (previewFileUrl) URL.revokeObjectURL(previewFileUrl);
        setPreviewFile(file);
        setPreviewFileUrl(URL.createObjectURL(file));
        setPreviewCleared(false);
    };

    const clearPreviewImage = () => {
        if (previewFileUrl) URL.revokeObjectURL(previewFileUrl);
        setPreviewFile(null);
        setPreviewFileUrl(null);
        setExistingPreviewImageUrl(null);
        setPreviewCleared(true);
    };

    const handleUpdate = async () => {
        if (!base.top || !base.pants || !base.shoes) {
            setError("Pick at least a top, pants, and shoes before saving — every outfit needs its base.");
            return;
        }
        setError("");
        setSaving(true);

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("season", season);
            formData.append("occasion", occasion);
            formData.append("base", JSON.stringify({
                top: base.top._id,
                pants: base.pants._id,
                shoes: base.shoes._id,
            }));
            formData.append("items", JSON.stringify(extraItems.map((i) => i._id)));

            if (previewFile) {
                formData.append("previewImage", previewFile);
            } else if (previewCleared) {
                const collageBlob = await collageRef.current?.getFlattenedBlob();
                if (collageBlob) {
                    formData.append("previewImage", collageBlob, "collage.png");
                } else {
                    formData.append("previewImage", "");
                }
            }

            const response = await axios.put(`/outfits/update/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.status === 200) {
                navigate("/pages/outfit");
            }
        } catch (e) {
            console.log(e);
            setError("Something went wrong saving this outfit.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Typography sx={{ padding: 4 }}>Loading...</Typography>;

    return (
        <Box sx={{ padding: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Typography variant="h4" gutterBottom>
                Update Outfit
            </Typography>

            <Grid container spacing={4} justifyContent="center" sx={{ maxWidth: 1200 }}>

                {/* Left: preview + actions */}
                <Grid item>
                    <Stack spacing={1} alignItems="center">
                        {previewFileUrl || existingPreviewImageUrl ? (
                            <Box
                                component="img"
                                src={previewFileUrl || existingPreviewImageUrl}
                                alt="Outfit preview"
                                sx={{ width: 500, height: 500, objectFit: "cover", borderRadius: 1 }}
                            />
                        ) : (
                            <CollageEditor ref={collageRef} items={selectedItems} size={500} />
                        )}

                        <Stack direction="row" gap={1}>
                            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>
                                Upload Picture
                                <VisuallyHiddenInput type="file" accept="image/*" onChange={handlePreviewFileChange} />
                            </Button>
                            <Tooltip title="Coming soon — VTO pipeline integration is still being wired in">
                                <span>
                                    <Button variant="contained" color="secondary" startIcon={<AutoAwesomeIcon />} disabled>
                                        Generate (VTO)
                                    </Button>
                                </span>
                            </Tooltip>
                        </Stack>
                        {(previewFileUrl || existingPreviewImageUrl) && (
                            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={clearPreviewImage}>
                                Use Collage Instead
                            </Button>
                        )}
                    </Stack>
                </Grid>

                {/* Right: name/details + item picker */}
                <Grid item xs>
                    <Stack spacing={2}>
                        <Stack direction="row" spacing={2}>
                            <TextField label="Outfit Name" value={name} onChange={(e) => setName(e.target.value)} size="small" />
                            <TextField
                                label="Season" variant="outlined" select size="small"
                                InputLabelProps={{ shrink: true }}
                                slotProps={{ select: { native: true } }}
                                value={season} onChange={(e) => setSeason(e.target.value)}
                            >
                                {seasons.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </TextField>
                            <TextField label="Occasion" value={occasion} onChange={(e) => setOccasion(e.target.value)} size="small" />
                        </Stack>

                        <Tabs value={topTier} onChange={handleTopTierChange}>
                            {Object.keys(CATEGORY_TABS).map((tab) => (
                                <Tab key={tab} value={tab} label={tab} />
                            ))}
                        </Tabs>

                        <Tabs value={subTier} onChange={(e, v) => setSubTier(v)} variant="scrollable">
                            {CATEGORY_TABS[topTier].map((tab) => (
                                <Tab key={tab} value={tab} label={tab} />
                            ))}
                        </Tabs>

                        <Grid container spacing={1}>
                            {gridItems.length === 0 && (
                                <Typography variant="body2" color="text.secondary" sx={{ padding: 2 }}>
                                    No {subTier.toLowerCase()} in your closet yet.
                                </Typography>
                            )}
                            {gridItems.map((item) => {
                                const selected = isSelected(item);
                                const baseLabel = baseLabelFor(item);
                                return (
                                    <Grid item key={item._id}>
                                        <Stack alignItems="center" spacing={0.5}>
                                            <Box
                                                onClick={() => handleItemClick(item)}
                                                title={item.name}
                                                sx={{
                                                    width: 90,
                                                    height: 90,
                                                    border: selected ? "3px solid" : "1px solid",
                                                    borderColor: selected ? "primary.main" : "grey.300",
                                                    borderRadius: 1,
                                                    cursor: "pointer",
                                                    overflow: "hidden",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    bgcolor: "grey.100",
                                                }}
                                            >
                                                {item.imageFrontUrl ? (
                                                    <Box
                                                        component="img"
                                                        src={item.imageFrontUrl}
                                                        alt={item.name}
                                                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <ImageIcon sx={{ fontSize: 40, color: "grey.400" }} />
                                                )}
                                            </Box>
                                            {baseLabel && (
                                                <Typography variant="caption" color="primary" fontWeight="bold">
                                                    {baseLabel}
                                                </Typography>
                                            )}
                                        </Stack>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        <Stack direction="row" spacing={2} alignItems="center">
                            <Button variant="contained" onClick={handleUpdate} disabled={saving}>
                                {saving ? "Saving…" : "Update Outfit"}
                            </Button>
                            {error && <Typography color="error" variant="body2">{error}</Typography>}
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
};

export default UpdateOutfitComponent;
