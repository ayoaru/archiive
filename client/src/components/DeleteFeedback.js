import React, { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import CloseIcon from "@mui/icons-material/Close";
import { SERIF, monoLabel } from "../theme";

const TOAST_MS = 3000;

// Confirm before deleting. `onConfirm` returns a promise and throws on failure;
// the dialog shows progress and keeps itself open with an error if it fails.
export const DeleteDialog = ({ open, onClose, onConfirm, name, from }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleClose = () => {
        if (busy) return;
        setError("");
        onClose();
    };

    const handleConfirm = async () => {
        setBusy(true);
        setError("");
        try {
            await onConfirm();
        } catch (e) {
            console.log(e);
            setError("Couldn't delete this. Check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="delete-title"
            slotProps={{
                backdrop: { sx: { bgcolor: "overlay", backdropFilter: "blur(2px)" } },
                paper: { sx: { width: "100%", maxWidth: 440, m: 2, borderTop: 2, borderTopColor: "error.main" } },
            }}
        >
            <Box sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography sx={{ ...monoLabel, color: "error.main", mb: 1.5 }}>
                    Delete · permanent
                </Typography>
                <Typography
                    id="delete-title"
                    component="h2"
                    sx={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 30, lineHeight: 1.15, mb: 1.5, wordBreak: "break-word" }}
                >
                    Delete {name || "this"}?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    This removes it from {from} for good. It can't be undone.
                </Typography>
                {error && (
                    <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>
                        {error}
                    </Typography>
                )}
                <Stack direction="row" justifyContent="flex-end" gap={1} sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}>
                    <Button color="inherit" onClick={handleClose} disabled={busy} autoFocus>
                        Keep it
                    </Button>
                    <Button color="error" variant="contained" onClick={handleConfirm} disabled={busy}>
                        {busy ? "Deleting…" : "Delete"}
                    </Button>
                </Stack>
            </Box>
        </Dialog>
    );
};

// Bottom-right note after a delete, with a countdown rule along the bottom
export const DeletedToast = ({ open, name, onClose }) => {
    const handleClose = (event, reason) => {
        if (reason === "clickaway") return;
        onClose();
    };

    return (
        <Snackbar
            open={open}
            autoHideDuration={TOAST_MS}
            onClose={handleClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        >
            <Box
                role="status"
                sx={{
                    position: "relative",
                    minWidth: 280,
                    maxWidth: 380,
                    bgcolor: "background.default",
                    border: 1,
                    borderColor: "text.primary",
                    overflow: "hidden",
                }}
            >
                <Stack direction="row" alignItems="flex-start" gap={2} sx={{ p: 2, pr: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ ...monoLabel, color: "text.secondary", mb: 0.5 }}>Deleted</Typography>
                        <Typography noWrap sx={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18 }}>
                            {name || "Untitled"}
                        </Typography>
                    </Box>
                    <IconButton size="small" aria-label="Dismiss" onClick={() => onClose()} sx={{ color: "text.secondary" }}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
                <Box
                    sx={{
                        height: 2,
                        bgcolor: "primary.main",
                        "@keyframes countdown": { from: { width: "100%" }, to: { width: "0%" } },
                        animation: open ? `countdown ${TOAST_MS}ms linear forwards` : "none",
                    }}
                />
            </Box>
        </Snackbar>
    );
};
