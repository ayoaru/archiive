import React, { useEffect, useMemo, useState } from "react";
import Stack from "@mui/material/Stack";
import axios from "axios";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/react";
import ItemCard from "../components/ItemCard";
import WishlistItemCard from "../components/WishlistItemCard";
import OutfitCard from "../components/OutfitCard";
import { SERIF, monoLabel } from "../theme";

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];

// Northern-hemisphere meteorological seasons
const currentSeason = (date = new Date()) => {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
};

// Folds scraped or older values into the form's options ("Autumn" -> "Fall", blank -> "Any")
const normalizeSeason = (season) => {
  const s = (season || "").trim().toLowerCase();
  if (s === "autumn" || s === "fall") return "Fall";
  const match = SEASONS.find((x) => x.toLowerCase() === s);
  return match || "Any";
};

// Items for this season first, then all-season ("Any") pieces
const forSeason = (list, season) => {
  const exact = list.filter((i) => normalizeSeason(i.season) === season);
  const any = list.filter((i) => normalizeSeason(i.season) === "Any");
  return { list: [...exact, ...any], exact: exact.length };
};

const randomizeMessage = (name) => {
  const messages = [
    `Welcome back${name}.`,
    `Looking good${name}.`,
    `Looking stylish${name}.`,
    `Feeling bold today${name}?`,
    `Looking for some inspo${name}?`,
    `Ready for a new look${name}?`,
    `A new day, a new outfit${name}.`,
    `Did someone already say you look good today${name}?`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

// Horizontal, snap-scrolling row of tiles
const Shelf = ({ children, width = 220 }) => (
  <Box
    sx={{
      display: "grid",
      gridAutoFlow: "column",
      gridAutoColumns: width,
      gap: 4,
      overflowX: "auto",
      scrollSnapType: "x mandatory",
      px: { xs: 2, sm: 4 },
      pb: 2,
      scrollPaddingInline: { xs: 16, sm: 32 },
      "& > *": { scrollSnapAlign: "start" },
    }}
  >
    {children}
  </Box>
);

const Section = ({ no, title, count, exact, season, onViewAll, children, empty }) => (
  <Box component="section" sx={{ pt: 6 }}>
    <Stack
      direction="row"
      alignItems="flex-end"
      justifyContent="space-between"
      sx={{ mx: { xs: 2, sm: 4 }, mb: 3, pb: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <Stack direction="row" alignItems="baseline" gap={2}>
        <Typography sx={{ ...monoLabel, color: "primary.main" }}>{no}</Typography>
        <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: { xs: 24, sm: 30 }, lineHeight: 1 }}>
          {title}
        </Typography>
      </Stack>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography sx={{ ...monoLabel, color: "text.secondary", display: { xs: "none", sm: "block" } }}>
          {String(exact).padStart(3, "0")} {season} · {String(count - exact).padStart(3, "0")} all-season
        </Typography>
        <Button size="small" onClick={onViewAll} sx={{ mr: -1 }}>View all →</Button>
      </Stack>
    </Stack>
    {count > 0 ? children : empty}
  </Box>
);

const EmptyShelf = ({ text, action, onAction }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    alignItems={{ sm: "center" }}
    justifyContent="space-between"
    gap={2}
    sx={{ mx: { xs: 2, sm: 4 }, p: 3, border: 1, borderStyle: "dashed", borderColor: "divider" }}
  >
    <Typography sx={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 18, color: "text.secondary" }}>
      {text}
    </Typography>
    {action && <Button variant="outlined" color="inherit" onClick={onAction}>{action}</Button>}
  </Stack>
);

const Home = () => {
  const [closetList, setClosetList] = useState([]);
  const [wishlistList, setWishlistList] = useState([]);
  const [outfitList, setOutfitList] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [deletedItemName, setDeletedItemName] = useState("");
  const [season, setSeason] = useState(currentSeason);

  const { user } = useUser();
  const navigate = useNavigate();
  const firstName = user?.firstName ? `, ${user.firstName}` : "";
  const greeting = useMemo(() => randomizeMessage(firstName), [firstName]);

  useEffect(() => {
    getAll();
  }, []);

  const getAll = async () => {
    const [closet, wishlist, outfits] = await Promise.allSettled([
      axios.get("/closet/read"),
      axios.get("/wishlist/read"),
      axios.get("/outfits/read"),
    ]);
    if (closet.status === "fulfilled") setClosetList(closet.value.data);
    if (wishlist.status === "fulfilled") setWishlistList(wishlist.value.data);
    if (outfits.status === "fulfilled") setOutfitList(outfits.value.data);
    [closet, wishlist, outfits]
      .filter((r) => r.status === "rejected")
      .forEach((r) => console.log(r.reason));
  };

  const handleDeleteSuccess = (itemName) => {
    setDeletedItemName(itemName);
    setSnackbarOpen(true);
    getAll();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const outfits = forSeason(outfitList, season);
  const closet = forSeason(closetList, season);
  const wishlist = forSeason(wishlistList, season);
  const seasonLower = season.toLowerCase();
  const isNow = season === currentSeason();

  return (
    <React.Fragment>
      {/* Seasonal masthead */}
      <Box sx={{ px: { xs: 2, sm: 4 }, pt: 5 }}>
        <Typography sx={{ ...monoLabel, color: "text.secondary", mb: 1.5 }}>{greeting}</Typography>
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ md: "flex-end" }}
          justifyContent="space-between"
          gap={2}
        >
          <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 44, sm: 64 } }}>
            The {seasonLower} edit<Box component="span" sx={{ color: "primary.main", fontStyle: "normal" }}>.</Box>
          </Typography>
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ pb: { md: 1 } }}>
            {SEASONS.map((s) => (
              <Box
                key={s}
                component="button"
                onClick={() => setSeason(s)}
                aria-pressed={season === s}
                sx={{
                  ...monoLabel,
                  padding: "4px 10px",
                  cursor: "pointer",
                  background: "none",
                  border: 1,
                  borderColor: season === s ? "primary.main" : "divider",
                  color: season === s ? "primary.main" : "text.secondary",
                  "&:hover": { color: season === s ? "primary.main" : "text.primary" },
                }}
              >
                {s}{s === currentSeason() && " · now"}
              </Box>
            ))}
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 520 }}>
          {isNow
            ? `What to wear right now: your ${seasonLower} looks and pieces, plus wishlist finds for the season.`
            : `Planning ahead: everything in your archive tagged for ${seasonLower}.`}
        </Typography>
      </Box>

      <Section
        no="01"
        title="Suggested outfits"
        count={outfits.list.length}
        exact={outfits.exact}
        season={season}
        onViewAll={() => navigate("/pages/outfit")}
        empty={
          <EmptyShelf
            text={`No ${seasonLower} outfits yet. Put one together from your closet.`}
            action="+ New outfit"
            onAction={() => navigate("/pages/addOutfit")}
          />
        }
      >
        <Shelf width={260}>
          {outfits.list.map((outfit, i) => (
            <OutfitCard key={outfit._id} outfit={outfit} index={i} onDeleteSuccess={handleDeleteSuccess} />
          ))}
        </Shelf>
      </Section>

      <Section
        no="02"
        title={`From your closet`}
        count={closet.list.length}
        exact={closet.exact}
        season={season}
        onViewAll={() => navigate("/pages/closet")}
        empty={
          <EmptyShelf
            text={`Nothing in your closet is tagged for ${seasonLower}.`}
            action="+ Add item"
            onAction={() => navigate("/pages/addItem")}
          />
        }
      >
        <Shelf>
          {closet.list.map((item, i) => (
            <ItemCard key={item._id} item={item} index={i} onDeleteSuccess={handleDeleteSuccess} />
          ))}
        </Shelf>
      </Section>

      <Section
        no="03"
        title="On your wishlist"
        count={wishlist.list.length}
        exact={wishlist.exact}
        season={season}
        onViewAll={() => navigate("/pages/wishlist")}
        empty={<EmptyShelf text={`No ${seasonLower} pieces on your wishlist.`} />}
      >
        <Shelf>
          {wishlist.list.map((item, i) => (
            <WishlistItemCard key={item._id} item={item} index={i} onDeleteSuccess={handleDeleteSuccess} />
          ))}
        </Shelf>
      </Section>

      <Box sx={{ height: 64 }} />

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          variant="filled"
          sx={{ width: "100%", padding: 0, overflow: "hidden" }}
        >
          <Stack sx={{ padding: "6px 16px 10px 16px" }}>
            <strong>{deletedItemName}</strong> was successfully deleted.
          </Stack>
          <Box
            sx={{
              height: 4,
              width: "100%",
              backgroundColor: "rgba(255,255,255,0.4)",
              "@keyframes countdown": {
                from: { width: "100%" },
                to: { width: "0%" },
              },
              animation: snackbarOpen ? "countdown 3s linear forwards" : "none",
            }}
          />
        </Alert>
      </Snackbar>

    </React.Fragment>
  );
};

export default Home;
