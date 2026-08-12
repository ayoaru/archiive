import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ImageIcon from "@mui/icons-material/Image";
import FlipToFrontIcon from "@mui/icons-material/FlipToFront";
import FlipToBackIcon from "@mui/icons-material/FlipToBack";
import { removeBackground } from "@imgly/background-removal";

// Routes an S3 image through our own server so the browser can fetch() it
// (background removal needs to read pixel data, and the bucket has no CORS policy).
// Must be absolute — @imgly/background-removal resolves relative URLs against
// its own CDN base rather than the page origin.
const proxiedUrl = (url) => `${window.location.origin}/image-proxy?url=${encodeURIComponent(url)}`;

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

// The segmentation model outputs a soft alpha mask, which leaves light-colored
// garments (white/cream) looking partially see-through instead of solid.
// Snap alpha to fully opaque or fully transparent so cutouts read as solid.
const ALPHA_THRESHOLD = 50;

// Light-on-dark details (e.g. white stripes on a black shoe) sometimes get
// misclassified as background entirely, punching transparent holes in the
// middle of an otherwise-solid item. Flood-fill in from the image border —
// any transparent pixel that's NOT reachable from the border is an enclosed
// hole rather than real background, so patch it back to opaque.
const fillEnclosedHoles = (imageData) => {
    const { width, height, data } = imageData;
    const total = width * height;
    const isTransparent = (idx) => data[idx * 4 + 3] === 0;

    const visited = new Uint8Array(total);
    const stack = new Int32Array(total);
    let sp = 0;

    const seed = (idx) => {
        if (isTransparent(idx) && !visited[idx]) {
            visited[idx] = 1;
            stack[sp++] = idx;
        }
    };

    for (let x = 0; x < width; x++) {
        seed(x);
        seed((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
        seed(y * width);
        seed(y * width + width - 1);
    }

    while (sp > 0) {
        const idx = stack[--sp];
        const x = idx % width;
        const y = (idx / width) | 0;
        if (x > 0) seed(idx - 1);
        if (x < width - 1) seed(idx + 1);
        if (y > 0) seed(idx - width);
        if (y < height - 1) seed(idx + width);
    }

    for (let idx = 0; idx < total; idx++) {
        if (isTransparent(idx) && !visited[idx]) {
            data[idx * 4 + 3] = 255;
        }
    }
};

// These product photos sit on a near-uniform studio backdrop, but its color
// varies by photo (light gray, black, etc). A pure local flood-fill (each
// pixel compared only to its already-claimed neighbor) turned out to leak:
// gradual shading within the garment fabric itself forms a chain of small
// steps that can walk the "background" region deep into the item, even
// though the far end looks nothing like the real backdrop. So a pixel must
// satisfy BOTH checks to count as background: close to its claimed neighbor
// (follows soft gradients in the actual backdrop) AND still within a wider
// tolerance of the original corner-sampled backdrop color (caps how far the
// fill is allowed to drift overall, so it can't tunnel into the garment).
const BG_PATCH = 20;
const sampleBackgroundColor = ({ width, height, data }) => {
    const corners = [
        [0, 0], [width - BG_PATCH, 0], [0, height - BG_PATCH], [width - BG_PATCH, height - BG_PATCH],
    ];
    let r = 0, g = 0, b = 0, n = 0;
    for (const [cx, cy] of corners) {
        for (let y = cy; y < cy + BG_PATCH; y++) {
            for (let x = cx; x < cx + BG_PATCH; x++) {
                const idx = (y * width + x) * 4;
                r += data[idx]; g += data[idx + 1]; b += data[idx + 2];
                n++;
            }
        }
    }
    return [r / n, g / n, b / n];
};

const LOCAL_COLOR_TOLERANCE = 25;
const ANCHOR_COLOR_TOLERANCE = 40;
const floodFillBackgroundMask = ({ width, height, data }, localTolerance, anchorTolerance) => {
    const total = width * height;
    const isBackground = new Uint8Array(total);
    const stack = new Int32Array(total);
    let sp = 0;
    const localToleranceSq = localTolerance * localTolerance;
    const anchorToleranceSq = anchorTolerance * anchorTolerance;

    const [ar, ag, ab] = sampleBackgroundColor({ width, height, data });
    const withinAnchor = (idx) => {
        const o = idx * 4;
        const dr = data[o] - ar, dg = data[o + 1] - ag, db = data[o + 2] - ab;
        return dr * dr + dg * dg + db * db <= anchorToleranceSq;
    };

    const closeEnough = (idxA, idxB) => {
        const a = idxA * 4, b = idxB * 4;
        const dr = data[a] - data[b], dg = data[a + 1] - data[b + 1], db = data[a + 2] - data[b + 2];
        return dr * dr + dg * dg + db * db <= localToleranceSq;
    };

    const claim = (idx) => {
        isBackground[idx] = 1;
        stack[sp++] = idx;
    };

    for (let x = 0; x < width; x++) {
        if (!isBackground[x] && withinAnchor(x)) claim(x);
        const bottom = (height - 1) * width + x;
        if (!isBackground[bottom] && withinAnchor(bottom)) claim(bottom);
    }
    for (let y = 0; y < height; y++) {
        const left = y * width;
        if (!isBackground[left] && withinAnchor(left)) claim(left);
        const right = y * width + width - 1;
        if (!isBackground[right] && withinAnchor(right)) claim(right);
    }

    while (sp > 0) {
        const idx = stack[--sp];
        const x = idx % width;
        const y = (idx / width) | 0;
        if (x > 0 && !isBackground[idx - 1] && withinAnchor(idx - 1) && closeEnough(idx, idx - 1)) claim(idx - 1);
        if (x < width - 1 && !isBackground[idx + 1] && withinAnchor(idx + 1) && closeEnough(idx, idx + 1)) claim(idx + 1);
        if (y > 0 && !isBackground[idx - width] && withinAnchor(idx - width) && closeEnough(idx, idx - width)) claim(idx - width);
        if (y < height - 1 && !isBackground[idx + width] && withinAnchor(idx + width) && closeEnough(idx, idx + width)) claim(idx + width);
    }

    return isBackground;
};

// The model's own RGB output is unreliable wherever its alpha confidence is
// low — those pixels often come out as near-black (premultiplied-looking)
// regardless of the garment's real color. So the model's output is used ONLY
// to derive an alpha signal; actual pixel colors always come from the
// original, untouched source image.
//
// The model also sometimes excludes large plain-colored regions outright
// (e.g. a solid dark garment against a light backdrop) rather than just
// soft-edging them — that's not something thresholding a soft mask can fix,
// since there's no meaningful alpha there to rescue. As a second signal, any
// pixel the border-flood-fill couldn't reach (i.e. not connected to the real
// backdrop) is also treated as foreground, regardless of what the model predicted.
const cutoutWithOriginalColor = async (maskBlob, originalSrc) => {
    const [maskBitmap, originalImg] = await Promise.all([
        createImageBitmap(maskBlob),
        loadImage(originalSrc),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = maskBitmap.width;
    canvas.height = maskBitmap.height;
    const ctx = canvas.getContext("2d");

    // Model's own alpha signal, thresholded to binary.
    ctx.drawImage(maskBitmap, 0, 0);
    const modelAlpha = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // True original colors, used both as the final pixel source and to derive
    // the background-flood-fill signal.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
    const original = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isBackground = floodFillBackgroundMask(original, LOCAL_COLOR_TOLERANCE, ANCHOR_COLOR_TOLERANCE);

    const combined = new ImageData(new Uint8ClampedArray(original.data), canvas.width, canvas.height);
    for (let i = 0, p = 0; i < combined.data.length; i += 4, p++) {
        const byModel = modelAlpha[i + 3] >= ALPHA_THRESHOLD;
        const byColor = !isBackground[p];
        combined.data[i + 3] = (byModel || byColor) ? 255 : 0;
    }

    fillEnclosedHoles(combined);
    ctx.putImageData(combined, 0, 0);

    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
};

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
// runs once per item and is cached for the life of this editor instance.
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

            removeBackground(proxiedUrl(item.imageFrontUrl))
                .then((maskBlob) => cutoutWithOriginalColor(maskBlob, proxiedUrl(item.imageFrontUrl)))
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
