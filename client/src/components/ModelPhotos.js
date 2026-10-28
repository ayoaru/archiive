import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import { DeleteDialog } from "./DeleteFeedback";
import { catalogNo } from "./Gallery";
import { monoLabel } from "../theme";

// Matches the server's upload limit (server/middleware/upload.js)
const MAX_BYTES = 5 * 1024 * 1024;

// Fetches and manages the signed-in user's model photos (the person photos the
// virtual try-on pipeline will dress). Shared by Settings and, later, try-on.
export const useModelPhotos = () => {
    const [photos, setPhotos] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");

    const refresh = async () => {
        try {
            const response = await axios.get("/model-photos/read");
            setPhotos(response.data);
            setLoadError("");
        } catch (e) {
            console.log(e);
            setLoadError("Couldn't load your photos.");
        } finally {
            setLoaded(true);
        }
    };

    useEffect(() => {
        refresh();
    }, []);

    const upload = async (file, label = "") => {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("label", label);
        await axios.post("/model-photos/create", formData);
        await refresh();
    };

    const rename = async (id, label) => {
        const formData = new FormData();
        formData.append("label", label);
        await axios.put("/model-photos/update/" + id, formData);
        setPhotos((list) => list.map((p) => (p._id === id ? { ...p, label } : p)));
    };

    const remove = async (id) => {
        await axios.delete("/model-photos/delete/" + id);
        setPhotos((list) => list.filter((p) => p._id !== id));
    };

    return { photos, loaded, loadError, refresh, upload, rename, remove };
};

const tileSx = {
    aspectRatio: "3 / 4",
    bgcolor: "grey.100",
    position: "relative",
    overflow: "hidden",
};

const PhotoTile = ({ photo, index, selectable, selected, onSelect, onRename, onDelete }) => {
    const [label, setLabel] = useState(photo.label || "");
    const [deleteOpen, setDeleteOpen] = useState(false);

    const commitLabel = () => {
        if (label.trim() !== (photo.label || "")) {
            onRename(photo._id, label.trim()).catch((e) => {
                console.log(e);
                setLabel(photo.label || "");
            });
        }
    };

    return (
        <Box>
            <Box
                component={selectable ? "button" : "div"}
                onClick={selectable ? () => onSelect(photo) : undefined}
                aria-pressed={selectable ? selected : undefined}
                sx={{
                    ...tileSx,
                    display: "block",
                    width: "100%",
                    p: 0,
                    border: 0,
                    cursor: selectable ? "pointer" : "default",
                    outline: "2px solid",
                    outlineColor: selected ? "primary.main" : "transparent",
                    outlineOffset: 2,
                    transition: "outline-color 120ms",
                    "&:hover": selectable ? { outlineColor: selected ? "primary.main" : "grey.400" } : {},
                }}
            >
                <Box
                    component="img"
                    src={photo.imageUrl}
                    alt={photo.label || `Try-on photo ${index + 1}`}
                    sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                {selected && (
                    <Box sx={{ position: "absolute", top: 8, right: 8, bgcolor: "primary.main", color: "primary.contrastText", display: "flex", p: 0.25 }}>
                        <CheckIcon sx={{ fontSize: 16 }} />
                    </Box>
                )}
            </Box>

            <Typography sx={{ ...monoLabel, color: "text.disabled", mt: 1 }}>Photo {catalogNo(index)}</Typography>
            {selectable ? (
                <Typography variant="body2">{photo.label || "Untitled"}</Typography>
            ) : (
                <>
                    <InputBase
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        onBlur={commitLabel}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                        placeholder="Add a label"
                        inputProps={{ maxLength: 40, "aria-label": `Label for photo ${index + 1}` }}
                        sx={{
                            width: "100%",
                            fontSize: 14,
                            borderBottom: 1,
                            borderColor: "transparent",
                            "&:hover, &.Mui-focused": { borderColor: "divider" },
                        }}
                    />
                    <Button size="small" color="error" onClick={() => setDeleteOpen(true)} sx={{ ml: -1, mt: 0.5 }}>
                        Delete
                    </Button>
                    <DeleteDialog
                        open={deleteOpen}
                        onClose={() => setDeleteOpen(false)}
                        onConfirm={async () => {
                            await onDelete(photo._id);
                            setDeleteOpen(false);
                        }}
                        name={photo.label || `photo ${catalogNo(index)}`}
                        from="your try-on photos"
                    />
                </>
            )}
        </Box>
    );
};

// Grid of model photos with an upload tile.
// - Settings uses it to manage photos (default).
// - The try-on flow can pass `selectable`, `selectedId` and `onSelect` to pick one.
const ModelPhotos = ({ selectable = false, selectedId = null, onSelect = () => {} }) => {
    const { photos, loaded, loadError, upload, rename, remove } = useModelPhotos();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const fileRef = useRef(null);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Choose an image file (JPG, PNG or WebP).");
            return;
        }
        if (file.size > MAX_BYTES) {
            setError("That photo is over 5 MB. Choose a smaller one.");
            return;
        }
        setError("");
        setUploading(true);
        try {
            await upload(file);
        } catch (err) {
            console.log(err);
            setError("Couldn't upload that photo. Try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 3,
                }}
            >
                {photos.map((photo, i) => (
                    <PhotoTile
                        key={photo._id}
                        photo={photo}
                        index={i}
                        selectable={selectable}
                        selected={selectedId === photo._id}
                        onSelect={onSelect}
                        onRename={rename}
                        onDelete={remove}
                    />
                ))}

                <Box>
                    <Box
                        component="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        sx={{
                            ...tileSx,
                            width: "100%",
                            bgcolor: "transparent",
                            border: 1,
                            borderStyle: "dashed",
                            borderColor: "divider",
                            color: "text.secondary",
                            cursor: uploading ? "progress" : "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            transition: "border-color 120ms, color 120ms",
                            "&:hover:not(:disabled)": { borderColor: "primary.main", color: "primary.main" },
                        }}
                    >
                        <AddIcon />
                        <Typography sx={{ ...monoLabel, color: "inherit" }}>
                            {uploading ? "Uploading…" : "Add photo"}
                        </Typography>
                    </Box>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                </Box>
            </Box>

            {(error || loadError) && (
                <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
                    {error || loadError}
                </Typography>
            )}
            {loaded && !loadError && photos.length === 0 && !error && (
                <Stack sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        No photos yet. Add one to get ready for virtual try-on.
                    </Typography>
                </Stack>
            )}
        </Box>
    );
};

export default ModelPhotos;
