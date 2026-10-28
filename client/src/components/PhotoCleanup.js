import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { cleanupImage, saveCutout } from "../imageCleanup";
import { monoLabel } from "../theme";

const SIDES = [
    { side: "front", main: "imageFront", url: "imageFrontUrl", original: "imageFrontOriginal", skip: "skipCutoutFront" },
    { side: "back", main: "imageBack", url: "imageBackUrl", original: "imageBackOriginal", skip: "skipCutoutBack" },
];

// Photos that still have their background: not yet cleaned, and not ones the
// user restored on purpose
const pendingJobs = (kind, items) =>
    items.flatMap((item) =>
        SIDES.filter((s) => item[s.main] && item[s.url] && !item[s.original] && !item[s.skip]).map((s) => ({
            kind,
            id: item._id,
            name: item.name || "Untitled",
            side: s.side,
            url: item[s.url],
        }))
    );

// Settings tool: removes backgrounds from photos added before cutouts existed.
// Runs in the browser one photo at a time, so it stops if the page is left.
const PhotoCleanup = () => {
    const [jobs, setJobs] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [running, setRunning] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0, current: "", message: "" });
    const [summary, setSummary] = useState("");
    const stopRef = useRef(false);

    const loadJobs = async () => {
        try {
            const [closet, wishlist] = await Promise.all([axios.get("/closet/read"), axios.get("/wishlist/read")]);
            setJobs([...pendingJobs("closet", closet.data), ...pendingJobs("wishlist", wishlist.data)]);
            setLoadError("");
        } catch (e) {
            console.log(e);
            setLoadError("Couldn't load your items.");
        } finally {
            setLoaded(true);
        }
    };

    useEffect(() => {
        loadJobs();
        return () => {
            stopRef.current = true;
        };
    }, []);

    const run = async () => {
        stopRef.current = false;
        setRunning(true);
        setSummary("");
        let cleaned = 0;
        let failed = 0;

        for (let i = 0; i < jobs.length; i++) {
            if (stopRef.current) break;
            const job = jobs[i];
            setProgress({ done: i, total: jobs.length, current: `${job.name} (${job.side})`, message: "" });
            try {
                const blob = await cleanupImage(job.url, {
                    onProgress: (message) => setProgress((p) => ({ ...p, message })),
                });
                if (stopRef.current) break;
                await saveCutout(job.kind, job.id, job.side, blob);
                cleaned++;
            } catch (e) {
                console.log(e);
                failed++;
            }
        }

        const stopped = stopRef.current;
        setRunning(false);
        setSummary(
            [
                `Cleaned ${cleaned} ${cleaned === 1 ? "photo" : "photos"}.`,
                failed ? `${failed} couldn't be processed and kept their original.` : "",
                stopped ? "Stopped early; the rest are still waiting." : "",
            ].filter(Boolean).join(" ")
        );
        loadJobs();
    };

    const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

    return (
        <Box>
            {!loaded ? (
                <Typography variant="body2" color="text.secondary">Checking your photos…</Typography>
            ) : loadError ? (
                <Typography variant="body2" color="error.main">{loadError}</Typography>
            ) : running ? (
                <Box>
                    <Typography sx={{ ...monoLabel, color: "text.secondary" }}>
                        {String(progress.done + 1).padStart(3, "0")} of {String(progress.total).padStart(3, "0")}
                    </Typography>
                    <Typography sx={{ mt: 0.5 }}>{progress.current}</Typography>
                    <Box sx={{ mt: 1.5, height: 2, bgcolor: "divider" }}>
                        <Box sx={{ height: 2, width: `${pct}%`, bgcolor: "primary.main", transition: "width 300ms" }} />
                    </Box>
                    {progress.message && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{progress.message}</Typography>
                    )}
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Keep this page open until it finishes.
                    </Typography>
                    <Button color="inherit" size="small" onClick={() => (stopRef.current = true)} sx={{ mt: 1, ml: -1 }}>
                        Stop
                    </Button>
                </Box>
            ) : (
                <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={2}>
                    <Typography variant="body2" color="text.secondary">
                        {jobs.length
                            ? `${jobs.length} ${jobs.length === 1 ? "photo still has its" : "photos still have their"} original background.`
                            : "All your photos are cleaned up."}
                    </Typography>
                    {jobs.length > 0 && (
                        <Button variant="contained" onClick={run}>
                            Clean up {jobs.length === 1 ? "photo" : "photos"}
                        </Button>
                    )}
                </Stack>
            )}
            {summary && !running && (
                <Typography variant="body2" sx={{ mt: 2 }}>{summary}</Typography>
            )}
        </Box>
    );
};

export default PhotoCleanup;
