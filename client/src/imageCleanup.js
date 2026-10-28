import axios from "axios";
import { removeBackground, preload } from "@imgly/background-removal";

// Background removal + centering for item photos. Runs entirely in the browser:
// the segmentation model (tens of MB) downloads once per device and is cached.
// The result is a transparent cutout centered on a 3:4 frame, so items sit on
// the app's own background in both light and dark mode.

// Large phone photos are slow to segment and flood-fill; this is plenty for tiles
const MAX_INPUT_SIDE = 1600;
const FRAME_RATIO = 3 / 4; // width / height, matches the item tiles
const FRAME_FILL = 0.86; // the item takes up to 86% of the frame either way

// Runs the model on the GPU (WebGPU) inside a web worker where the browser
// supports it: about 1 s per photo vs ~13 s on the CPU in testing. Browsers
// without WebGPU get the CPU (WebAssembly) path automatically.
//
// The engine can't switch backends within a page once one has loaded, so if
// the GPU path ever fails on a device that claims WebGPU support, that's
// remembered and the CPU is used from the next page load on. The config is
// fixed per page load and shared by preload and removal.
// v2: v1 could be set wrongly by the start-up race fixed below; ignore it
const NO_GPU_KEY = "archiive-cutout-no-gpu-v2";
const gpuAllowed = (() => {
    try {
        localStorage.removeItem("archiive-cutout-no-gpu"); // stale v1 flag
        return localStorage.getItem(NO_GPU_KEY) !== "1";
    } catch {
        return true;
    }
})();
const MODEL_CONFIG = gpuAllowed ? { device: "gpu", proxyToWorker: true } : { device: "cpu" };

// The engine can only start or run one session at a time: overlapping calls
// (front + back + preload, all kicked off together) fail with "Session
// mismatch" / "Session already started". So every model call waits its turn.
let modelQueue = Promise.resolve();
const exclusive = (task) => {
    const run = modelQueue.then(task, task);
    modelQueue = run.catch(() => {});
    return run;
};

const disableGpuForNextLoad = () => {
    try {
        localStorage.setItem(NO_GPU_KEY, "1");
    } catch {
        // Storage blocked: the GPU path will just be tried again next time
    }
};

// Our own S3 photos go through /image-proxy; anything else (a scraped store
// photo) through /image-fetch. Both return bytes the browser may read, which
// a cross-site <img> wouldn't allow. axios adds the sign-in token.
export const loadSourceBlob = async (source) => {
    if (source instanceof Blob) return source;
    const isOwnBucket = new URL(source, window.location.href).hostname.endsWith(".amazonaws.com");
    const response = await axios.get(isOwnBucket ? "/image-proxy" : "/image-fetch", {
        params: { url: source },
        responseType: "blob",
    });
    return response.data;
};

// Start downloading the model early (e.g. when a form opens) so the first
// cutout doesn't wait on it. Safe to call repeatedly.
let preloadPromise = null;
export const preloadCutoutModel = () => {
    if (!preloadPromise) {
        preloadPromise = exclusive(() => preload(MODEL_CONFIG)).catch((e) => {
            console.log(e);
            preloadPromise = null;
        });
    }
    return preloadPromise;
};

const canvasOf = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

const toBlob = (canvas, type, quality) =>
    new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))), type, quality)
    );

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

// The color-based flood fill below only makes sense on a plain studio backdrop.
// On a busy home photo it would treat most of the room as "not background" and
// keep it, so it's only used when the four corners agree and are each flat.
const isUniformBackdrop = ({ width, height, data }) => {
    if (width < BG_PATCH * 2 || height < BG_PATCH * 2) return false;
    const corners = [
        [0, 0], [width - BG_PATCH, 0], [0, height - BG_PATCH], [width - BG_PATCH, height - BG_PATCH],
    ];
    const stats = corners.map(([cx, cy]) => {
        let r = 0, g = 0, b = 0, sq = 0, n = 0;
        for (let y = cy; y < cy + BG_PATCH; y++) {
            for (let x = cx; x < cx + BG_PATCH; x++) {
                const i = (y * width + x) * 4;
                const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                r += data[i]; g += data[i + 1]; b += data[i + 2]; sq += lum * lum; n++;
            }
        }
        const mean = [r / n, g / n, b / n];
        const lumMean = 0.299 * mean[0] + 0.587 * mean[1] + 0.114 * mean[2];
        return { mean, std: Math.sqrt(Math.max(0, sq / n - lumMean * lumMean)) };
    });
    const flat = stats.every((s) => s.std < 12);
    const agree = stats.every((a) => stats.every((b) =>
        Math.hypot(a.mean[0] - b.mean[0], a.mean[1] - b.mean[1], a.mean[2] - b.mean[2]) < 30
    ));
    return flat && agree;
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
//
// The color signal is skipped on non-uniform backdrops (see isUniformBackdrop).
const cutoutWithOriginalColor = (maskBitmap, original) => {
    const { width, height } = original;
    const ctx = canvasOf(width, height).getContext("2d");
    ctx.drawImage(maskBitmap, 0, 0, width, height);
    const modelAlpha = ctx.getImageData(0, 0, width, height).data;

    const useColor = isUniformBackdrop(original);
    const isBackground = useColor
        ? floodFillBackgroundMask(original, LOCAL_COLOR_TOLERANCE, ANCHOR_COLOR_TOLERANCE)
        : null;

    const combined = new ImageData(new Uint8ClampedArray(original.data), width, height);
    for (let i = 0, p = 0; i < combined.data.length; i += 4, p++) {
        const byModel = modelAlpha[i + 3] >= ALPHA_THRESHOLD;
        const byColor = useColor && !isBackground[p];
        combined.data[i + 3] = (byModel || byColor) ? 255 : 0;
    }

    fillEnclosedHoles(combined);
    return combined;
};

// The model can leave stray specks of background (patterned bedding, clutter)
// far from the item. They're nearly invisible but would stretch the centering
// box, so drop opaque regions much smaller than the biggest one. Separate parts
// of similar size (a pair of shoes) are kept.
const MIN_REGION_SHARE = 0.03;
const removeSpecks = (imageData) => {
    const { width, height, data } = imageData;
    const total = width * height;
    const label = new Int32Array(total); // 0 = unvisited/transparent
    const sizes = [0];
    const stack = new Int32Array(total);

    for (let start = 0; start < total; start++) {
        if (label[start] || !data[start * 4 + 3]) continue;
        const id = sizes.length;
        let size = 0;
        let sp = 0;
        label[start] = id;
        stack[sp++] = start;
        while (sp > 0) {
            const idx = stack[--sp];
            size++;
            const x = idx % width;
            const neighbors = [
                x > 0 ? idx - 1 : -1,
                x < width - 1 ? idx + 1 : -1,
                idx >= width ? idx - width : -1,
                idx < total - width ? idx + width : -1,
            ];
            for (const n of neighbors) {
                if (n >= 0 && !label[n] && data[n * 4 + 3]) {
                    label[n] = id;
                    stack[sp++] = n;
                }
            }
        }
        sizes.push(size);
    }

    const largest = Math.max(0, ...sizes);
    const minSize = largest * MIN_REGION_SHARE;
    for (let idx = 0; idx < total; idx++) {
        if (label[idx] && sizes[label[idx]] < minSize) data[idx * 4 + 3] = 0;
    }
};

// Crops to the item's opaque pixels and centers it on a 3:4 transparent frame
// with even padding. Returns a canvas, or null if nothing was kept.
const centerOnFrame = (imageData) => {
    const { width, height, data } = imageData;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * 4 + 3]) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return null;

    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    // Frame big enough that the box fills FRAME_FILL of its tighter dimension
    let frameH = Math.max(boxH, boxW / FRAME_RATIO) / FRAME_FILL;
    const scale = Math.min(1, MAX_INPUT_SIDE / frameH);
    frameH = Math.round(frameH * scale);
    const frameW = Math.round(frameH * FRAME_RATIO);

    const source = canvasOf(width, height);
    source.getContext("2d").putImageData(imageData, 0, 0);

    const frame = canvasOf(frameW, frameH);
    const drawW = boxW * scale;
    const drawH = boxH * scale;
    frame.getContext("2d").drawImage(
        source, minX, minY, boxW, boxH,
        (frameW - drawW) / 2, (frameH - drawH) / 2, drawW, drawH
    );
    return frame;
};

// Full pipeline. `source` is a File/Blob or an image URL.
// `onProgress(message)` reports the one-time model download.
// Returns a WebP Blob (PNG where the browser can't encode WebP).
export const cleanupImage = async (source, { center = true, onProgress } = {}) => {
    const blob = await loadSourceBlob(source);

    // Downscale big photos before segmenting
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_INPUT_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const inputCanvas = canvasOf(width, height);
    const inputCtx = inputCanvas.getContext("2d");
    inputCtx.drawImage(bitmap, 0, 0, width, height);
    if (bitmap.close) bitmap.close();
    const original = inputCtx.getImageData(0, 0, width, height);
    const input = await toBlob(inputCanvas, "image/png");

    let maskBlob;
    try {
        maskBlob = await exclusive(() => removeBackground(input, {
            ...MODEL_CONFIG,
            progress: (key, current, total) => {
                if (onProgress && key.startsWith("fetch:") && total) {
                    onProgress(`Downloading the cutout model (first time only), ${Math.round((current / total) * 100)}%`);
                }
            },
        }));
    } catch (e) {
        // Only "this device can't run the GPU engine", not session/timing
        // errors or e.g. a corrupt photo
        if (MODEL_CONFIG.device === "gpu" && /no available backend|jsep|webgpu/i.test(e?.message || "")) {
            disableGpuForNextLoad();
        }
        throw e;
    }
    const maskBitmap = await createImageBitmap(maskBlob);
    const cut = cutoutWithOriginalColor(maskBitmap, original);
    if (maskBitmap.close) maskBitmap.close();
    removeSpecks(cut);

    let out;
    if (center) {
        out = centerOnFrame(cut);
        if (!out) throw new Error("Couldn't find the item in that photo");
    } else {
        out = canvasOf(width, height);
        out.getContext("2d").putImageData(cut, 0, 0);
    }

    const webp = await toBlob(out, "image/webp", 0.9);
    return webp.type === "image/webp" ? webp : toBlob(out, "image/png");
};

// Saves a cutout for an item's photo; the server keeps the untouched photo as
// the original. `kind` is "closet" or "wishlist", `side` "front" or "back".
export const saveCutout = (kind, id, side, blob) => {
    const formData = new FormData();
    formData.append("side", side);
    formData.append("action", "clean");
    formData.append("image", blob, `${side}.${blob.type === "image/webp" ? "webp" : "png"}`);
    return axios.post(`/${kind}/images/${id}`, formData);
};

// Puts an item's original photo back in place of its cutout
export const restoreOriginal = (kind, id, side) => {
    const formData = new FormData();
    formData.append("side", side);
    formData.append("action", "restore");
    return axios.post(`/${kind}/images/${id}`, formData);
};
