import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ImageIcon from "@mui/icons-material/Image";
import FlipToFrontIcon from "@mui/icons-material/FlipToFront";
import FlipToBackIcon from "@mui/icons-material/FlipToBack";
import { cleanupImage, loadSourceBlob } from "../imageCleanup";

// Routes an S3 image through our own server so the canvas export can read its
// pixels (the bucket has no CORS policy).
const proxiedUrl = (url) => `${window.location.origin}/image-proxy?url=${encodeURIComponent(url)}`;

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

const defaultPosition = (index, size, w) => {
    const step = size * 0.12;
    const max = size - w - 10;
    return {
        x: Math.max(10, Math.min(10 + (index % 5) * step, max)),
        y: Math.max(10, Math.min(10 + (index % 5) * step, max)),
    };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// A Pinterest-style collage stage: drag items freely, click to bring one to
// front, use the front/back buttons to reorder layers. Background removal
// runs once per item (skipped for already-cleaned photos) and is cached for
// the life of this editor instance.
const CollageEditor = forwardRef(({ items, size = 500 }, ref) => {
    const [layers, setLayers] = useState([]);
    const [processed, setProcessed] = useState({});
    const [activeId, setActiveId] = useState(null);

    const requestedRef = useRef(new Set());
    const dragRef = useRef(null);

    // Keep one layer (position/size) per currently-selected item, preserving
    // existing positions for items that are still selected.
    useEffect(() => {
        setLayers((prev) => {
            const prevById = new Map(prev.map((l) => [l.id, l]));
            return items.map((item, i) => {
                const existing = prevById.get(item._id);
                if (existing) return { ...existing, item };
                const w = size * 0.5;
                return { id: item._id, item, w, h: w, ...defaultPosition(i, size, w) };
            });
        });
    }, [items, size]);

    // Kick off background removal exactly once per item.
    useEffect(() => {
        items.forEach((item) => {
            if (requestedRef.current.has(item._id)) return;
            requestedRef.current.add(item._id);

            setProcessed((prev) => ({ ...prev, [item._id]: { url: null, loading: true, error: false } }));

            // Photos cleaned when the item was added are already cutouts
            const job = item.imageFrontOriginal
                ? loadSourceBlob(item.imageFrontUrl)
                : cleanupImage(item.imageFrontUrl, { center: false });
            job
                .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    setProcessed((prev) => ({ ...prev, [item._id]: { url, loading: false, error: false } }));
                })
                .catch((e) => {
                    console.log(e);
                    setProcessed((prev) => ({ ...prev, [item._id]: { url: null, loading: false, error: true } }));
                });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    // Revoke object URLs on unmount to avoid leaking memory.
    useEffect(() => {
        return () => {
            Object.values(processed).forEach((p) => p.url && URL.revokeObjectURL(p.url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const bringToFront = (id) => {
        setLayers((prev) => {
            const idx = prev.findIndex((l) => l.id === id);
            if (idx === -1 || idx === prev.length - 1) return prev;
            const copy = [...prev];
            const [layer] = copy.splice(idx, 1);
            copy.push(layer);
            return copy;
        });
    };

    const sendToBack = (id) => {
        setLayers((prev) => {
            const idx = prev.findIndex((l) => l.id === id);
            if (idx <= 0) return prev;
            const copy = [...prev];
            const [layer] = copy.splice(idx, 1);
            copy.unshift(layer);
            return copy;
        });
    };

    const handlePointerDown = (e, layer) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { id: layer.id, startX: e.clientX, startY: e.clientY, origX: layer.x, origY: layer.y };
        setActiveId(layer.id);
        bringToFront(layer.id);
    };

    const handlePointerMove = (e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        setLayers((prev) =>
            prev.map((l) =>
                l.id === drag.id
                    ? { ...l, x: clamp(drag.origX + dx, 0, size - l.w), y: clamp(drag.origY + dy, 0, size - l.h) }
                    : l
            )
        );
    };

    const handlePointerUp = () => {
        dragRef.current = null;
    };

    useImperativeHandle(ref, () => ({
        getFlattenedBlob: async () => {
            if (layers.length === 0) return null;

            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#f5f5f5";
            ctx.fillRect(0, 0, size, size);

            for (const layer of layers) {
                const src = processed[layer.id]?.url || proxiedUrl(layer.item.imageFrontUrl);
                try {
                    const img = await loadImage(src);
                    ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h);
                } catch (e) {
                    console.log(e);
                }
            }

            return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        },
    }), [layers, processed, size]);

    if (items.length === 0) {
        return (
            <Box
                sx={{
                    width: size, height: size, bgcolor: "grey.100", borderRadius: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}
            >
                <ImageIcon sx={{ fontSize: size / 3, color: "grey.400" }} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                position: "relative",
                width: size,
                height: size,
                bgcolor: "grey.100",
                borderRadius: 1,
                overflow: "hidden",
                touchAction: "none",
            }}
        >
            {layers.map((layer) => {
                const state = processed[layer.id];
                const isActive = activeId === layer.id;
                return (
                    <Box
                        key={layer.id}
                        onPointerDown={(e) => handlePointerDown(e, layer)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        sx={{
                            position: "absolute",
                            left: layer.x,
                            top: layer.y,
                            width: layer.w,
                            height: layer.h,
                            cursor: "grab",
                            outline: isActive ? "2px solid" : "none",
                            outlineColor: "primary.main",
                        }}
                    >
                        {state?.loading ? (
                            <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CircularProgress size={28} />
                            </Box>
                        ) : (
                            <Box
                                component="img"
                                src={state?.url || proxiedUrl(layer.item.imageFrontUrl)}
                                alt={layer.item.name}
                                draggable={false}
                                sx={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
                            />
                        )}
                        {isActive && (
                            <Box sx={{ position: "absolute", top: -16, right: -16, display: "flex", gap: 0.5 }}>
                                <IconButton
                                    size="small"
                                    sx={{ bgcolor: "background.paper", boxShadow: 1 }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => bringToFront(layer.id)}
                                    title="Bring to front"
                                >
                                    <FlipToFrontIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    sx={{ bgcolor: "background.paper", boxShadow: 1 }}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => sendToBack(layer.id)}
                                    title="Send to back"
                                >
                                    <FlipToBackIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                );
            })}
        </Box>
    );
});

export default CollageEditor;
