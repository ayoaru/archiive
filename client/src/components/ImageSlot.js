import React, { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import CircularProgress from "@mui/material/CircularProgress";
import ImageIcon from "@mui/icons-material/Image";
import { cleanupImage } from "../imageCleanup";
import { monoLabel } from "../theme";

const IDLE = { status: "idle", blob: null, url: null, message: "" };

// Runs background removal on `source` (a File or image URL) while `enabled`.
// `result()` resolves to the cutout Blob, or null if it's off or failed, so a
// save can wait for work that's still in progress.
export const useCutout = (source, enabled) => {
    const [state, setState] = useState(IDLE);
    const promiseRef = useRef(Promise.resolve(null));

    useEffect(() => {
        if (!source || !enabled) {
            setState(IDLE);
            promiseRef.current = Promise.resolve(null);
            return undefined;
        }

        let live = true;
        let objectUrl = null;
        setState({ status: "working", blob: null, url: null, message: "Removing background…" });

        promiseRef.current = cleanupImage(source, {
            onProgress: (message) => live && setState((s) => ({ ...s, message })),
        })
            .then((blob) => {
                if (live) {
                    objectUrl = URL.createObjectURL(blob);
                    setState({ status: "done", blob, url: objectUrl, message: "" });
                }
                return blob;
            })
            .catch((e) => {
                console.log(e);
                if (live) {
                    setState({
                        status: "error",
                        blob: null,
                        url: null,
                        message: "Couldn't remove the background. The original photo will be saved.",
                    });
                }
                return null;
            });

        return () => {
            live = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [source, enabled]);

    return { ...state, result: () => promiseRef.current };
};

// One photo slot on the add/edit forms: preview tile, "Remove background"
// switch, and actions. Stateless; the parent owns the photo and the cutout.
const ImageSlot = ({
    label,
    previewSrc,
    cutout,
    removeBg,
    onToggleRemoveBg,
    onFileChange,
    onRemove,
    extraActions,
}) => {
    const showCutout = removeBg && cutout?.status === "done";
    const working = removeBg && cutout?.status === "working";
    const src = showCutout ? cutout.url : previewSrc;

    return (
        <Stack sx={{ width: 220 }} gap={1}>
            <Typography sx={{ ...monoLabel, color: "text.secondary" }}>{label}</Typography>

            <Box
                sx={{
                    position: "relative",
                    aspectRatio: "3 / 4",
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                {src ? (
                    <Box
                        component="img"
                        src={src}
                        alt={label}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: showCutout ? "contain" : "cover",
                            display: "block",
                            opacity: working ? 0.35 : 1,
                            transition: "opacity 200ms",
                        }}
                    />
                ) : (
                    <ImageIcon sx={{ fontSize: 56, color: "grey.400" }} />
                )}
                {working && (
                    <Stack
                        alignItems="center"
                        justifyContent="center"
                        gap={1.5}
                        sx={{ position: "absolute", inset: 0, p: 2, textAlign: "center" }}
                    >
                        <CircularProgress size={24} />
                        <Typography sx={{ ...monoLabel, fontSize: 10, color: "text.primary" }}>
                            {cutout.message}
                        </Typography>
                    </Stack>
                )}
            </Box>

            {previewSrc && (
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography component="label" htmlFor={`remove-bg-${label}`} sx={{ ...monoLabel, color: "text.secondary", cursor: "pointer" }}>
                        Remove background
                    </Typography>
                    <Switch
                        id={`remove-bg-${label}`}
                        size="small"
                        checked={removeBg}
                        onChange={(e) => onToggleRemoveBg(e.target.checked)}
                    />
                </Stack>
            )}
            {removeBg && cutout?.status === "error" && (
                <Typography variant="body2" color="error.main">{cutout.message}</Typography>
            )}

            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ ml: -1 }}>
                <Button component="label" size="small">
                    Upload
                    <input type="file" accept="image/*" hidden onChange={onFileChange} />
                </Button>
                {extraActions}
                {previewSrc && (
                    <Button size="small" color="error" onClick={onRemove}>
                        Remove
                    </Button>
                )}
            </Stack>
        </Stack>
    );
};

export default ImageSlot;
