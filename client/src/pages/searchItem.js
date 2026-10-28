import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import SearchIcon from "@mui/icons-material/Search";
import ImageIcon from "@mui/icons-material/Image";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ItemCard from "../components/ItemCard";
import WishlistItemCard from "../components/WishlistItemCard";
import { Gallery, catalogNo } from "../components/Gallery";
import { SERIF, monoLabel } from "../theme";

const SEARCH_FIELDS = ["name", "brand", "category", "season", "style", "primary_color", "secondary_color", "fit"];

// Unique, non-empty values of a field, sorted
const valuesOf = (items, field) =>
  [...new Set(items.map((i) => i[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

// Color names like "Navy" are valid CSS colors; anything else gets no swatch
const swatch = (color) =>
  color && window.CSS?.supports?.("color", color.toLowerCase()) ? color.toLowerCase() : null;

// Small mono toggle pill used for every filter row
const Pill = ({ active, onClick, children, dot }) => (
  <Box
    component="button"
    onClick={onClick}
    aria-pressed={active}
    sx={{
      ...monoLabel,
      display: "inline-flex",
      alignItems: "center",
      gap: 0.75,
      padding: "4px 10px",
      cursor: "pointer",
      background: "none",
      border: 1,
      borderColor: active ? "primary.main" : "divider",
      color: active ? "primary.main" : "text.secondary",
      transition: "border-color 120ms, color 120ms",
      "&:hover": { borderColor: active ? "primary.main" : "text.secondary", color: active ? "primary.main" : "text.primary" },
    }}
  >
    {dot && <Box component="span" sx={{ width: 8, height: 8, bgcolor: dot, border: 1, borderColor: "divider" }} />}
    {children}
  </Box>
);

const FilterRow = ({ label, children }) => (
  <Stack direction="row" alignItems="center" gap={2} sx={{ py: 1 }}>
    <Typography sx={{ ...monoLabel, color: "text.disabled", width: 72, flexShrink: 0 }}>{label}</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap">{children}</Stack>
  </Stack>
);

// One row of the archive index
const IndexRow = ({ item, index, onOpen }) => {
  const dot = swatch(item.primary_color);
  const cell = { ...monoLabel, color: "text.secondary", display: { xs: "none", md: "block" } };

  return (
    <Box
      component="button"
      onClick={onOpen}
      sx={{
        all: "unset",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: { xs: "40px 48px 1fr 24px", md: "48px 56px 2fr 1fr 1fr 1fr 110px 24px" },
        alignItems: "center",
        gap: 2,
        width: "100%",
        py: 1.5,
        px: 1,
        cursor: "pointer",
        borderBottom: 1,
        borderColor: "divider",
        transition: "background-color 120ms",
        "&:hover, &:focus-visible": { bgcolor: "grey.50" },
        "&:hover .arrow, &:focus-visible .arrow": { color: "primary.main", transform: "translateX(2px)" },
        "&:hover .thumb, &:focus-visible .thumb": { outlineColor: "primary.main" },
      }}
    >
      <Typography sx={{ ...monoLabel, color: "text.disabled" }}>{catalogNo(index)}</Typography>

      <Box
        className="thumb"
        sx={{
          width: { xs: 48, md: 56 },
          aspectRatio: "3 / 4",
          bgcolor: "grey.100",
          outline: "1px solid transparent",
          transition: "outline-color 120ms",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {item.imageFrontUrl ? (
          <Box component="img" src={item.imageFrontUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <ImageIcon sx={{ fontSize: 20, color: "grey.400" }} />
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontFamily: SERIF, fontSize: 18, lineHeight: 1.25 }}>{item.name}</Typography>
        <Typography noWrap variant="body2" color="text.secondary">
          {item.brand || "—"}
          <Box component="span" sx={{ display: { md: "none" } }}>{item.category && ` · ${item.category}`}</Box>
        </Typography>
      </Box>

      <Typography sx={cell}>{item.category || "—"}</Typography>
      <Typography sx={cell}>{item.season || "—"}</Typography>
      <Stack direction="row" alignItems="center" gap={1} sx={{ ...cell, display: { xs: "none", md: "flex" } }}>
        {dot && <Box sx={{ width: 8, height: 8, bgcolor: dot, border: 1, borderColor: "divider", flexShrink: 0 }} />}
        <span>{item.primary_color || "—"}</span>
      </Stack>
      <Typography sx={{ ...cell, color: item.source === "wishlist" ? "primary.main" : "text.disabled", textAlign: "right" }}>
        {item.source === "wishlist" ? `Wishlist${item.price ? ` · £${item.price}` : ""}` : "Closet"}
      </Typography>

      <ArrowForwardIcon className="arrow" sx={{ fontSize: 18, color: "text.disabled", transition: "color 120ms, transform 120ms" }} />
    </Box>
  );
};

const SearchItem = () => {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const [category, setCategory] = useState(null);
  const [season, setSeason] = useState(null);
  const [color, setColor] = useState(null);
  const [view, setView] = useState("index");
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    getItems();
  }, []);

  // "/" jumps to the search field from anywhere on the page
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const getItems = async () => {
    try {
      const [closet, wishlist] = await Promise.all([
        axios.get("/closet/read"),
        axios.get("/wishlist/read"),
      ]);
      setItems([
        ...closet.data.map((i) => ({ ...i, source: "closet" })),
        ...wishlist.data.map((i) => ({ ...i, source: "wishlist" })),
      ]);
    } catch (e) {
      console.log(e);
    } finally {
      setLoaded(true);
    }
  };

  const inScope = useMemo(
    () => (scope === "all" ? items : items.filter((i) => i.source === scope)),
    [items, scope]
  );

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return inScope.filter((item) => {
      if (category && item.category !== category) return false;
      if (season && item.season !== season) return false;
      if (color && item.primary_color !== color) return false;
      const haystack = SEARCH_FIELDS.map((f) => item[f] || "").join(" ").toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [inScope, query, category, season, color]);

  const hasFilters = query || category || season || color || scope !== "all";
  const clearAll = () => {
    setQuery("");
    setScope("all");
    setCategory(null);
    setSeason(null);
    setColor(null);
  };

  const toggle = (setter, current) => (value) => setter(current === value ? null : value);
  const openItem = (item) =>
    navigate(`/${item.source === "wishlist" ? "wishlist" : "closet"}/update/${item._id}`);

  const categories = valuesOf(inScope, "category");
  const seasons = valuesOf(inScope, "season");
  const colors = valuesOf(inScope, "primary_color");

  return (
    <Box sx={{ px: { xs: 2, sm: 4 }, pt: 5, pb: 6 }}>
      {/* Search field: the page headline */}
      <Stack
        direction="row"
        alignItems="center"
        gap={2}
        sx={{
          borderBottom: 1,
          borderColor: "text.primary",
          pb: 1,
          "&:focus-within": { borderColor: "primary.main" },
          "&:focus-within .search-icon": { color: "primary.main" },
        }}
      >
        <SearchIcon className="search-icon" sx={{ fontSize: { xs: 28, sm: 36 }, color: "text.disabled" }} />
        <InputBase
          inputRef={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the archive"
          inputProps={{ "aria-label": "Search your closet and wishlist" }}
          sx={{
            flex: 1,
            fontFamily: SERIF,
            fontStyle: "italic",
            fontSize: { xs: 32, sm: 48 },
            lineHeight: 1.1,
            "& input::placeholder": { color: "text.disabled", opacity: 1 },
          }}
        />
        {query ? (
          <Button size="small" color="inherit" onClick={() => setQuery("")}>Clear</Button>
        ) : (
          <Typography sx={{ ...monoLabel, color: "text.disabled", border: 1, borderColor: "divider", px: 0.75, display: { xs: "none", sm: "block" } }}>
            /
          </Typography>
        )}
      </Stack>

      {/* Filters */}
      <Box sx={{ mt: 2, mb: 3 }}>
        <FilterRow label="In">
          {[["all", "Everything"], ["closet", "Closet"], ["wishlist", "Wishlist"]].map(([value, label]) => (
            <Pill key={value} active={scope === value} onClick={() => setScope(value)}>{label}</Pill>
          ))}
        </FilterRow>
        {categories.length > 0 && (
          <FilterRow label="Category">
            {categories.map((c) => <Pill key={c} active={category === c} onClick={() => toggle(setCategory, category)(c)}>{c}</Pill>)}
          </FilterRow>
        )}
        {seasons.length > 0 && (
          <FilterRow label="Season">
            {seasons.map((s) => <Pill key={s} active={season === s} onClick={() => toggle(setSeason, season)(s)}>{s}</Pill>)}
          </FilterRow>
        )}
        {colors.length > 0 && (
          <FilterRow label="Color">
            {colors.map((c) => (
              <Pill key={c} active={color === c} dot={swatch(c)} onClick={() => toggle(setColor, color)(c)}>{c}</Pill>
            ))}
          </FilterRow>
        )}
      </Box>

      {/* Result count + view switch */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ borderBottom: 1, borderColor: "divider", pb: 1 }}>
        <Stack direction="row" alignItems="center" gap={2}>
          <Typography sx={{ ...monoLabel, color: "text.secondary" }}>
            {String(results.length).padStart(3, "0")} {results.length === 1 ? "result" : "results"}
          </Typography>
          {hasFilters && (
            <Button size="small" onClick={clearAll} sx={{ minWidth: 0, py: 0 }}>Reset</Button>
          )}
        </Stack>
        <Stack direction="row" gap={2}>
          {["index", "grid"].map((v) => (
            <Box
              key={v}
              component="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              sx={{
                ...monoLabel,
                background: "none",
                border: 0,
                padding: "2px 0",
                cursor: "pointer",
                color: view === v ? "text.primary" : "text.disabled",
                borderBottom: 2,
                borderColor: view === v ? "primary.main" : "transparent",
              }}
            >
              {v}
            </Box>
          ))}
        </Stack>
      </Stack>

      {/* Results */}
      {loaded && results.length === 0 ? (
        <Box sx={{ py: 10, textAlign: "center" }}>
          <Typography sx={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 28 }}>
            {items.length === 0 ? "Your archive is empty" : "Nothing matches"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            {items.length === 0
              ? "Add a piece to your closet or wishlist to start searching."
              : "Try a different word or loosen a filter."}
          </Typography>
          {items.length === 0 ? (
            <Button variant="contained" onClick={() => navigate("/pages/addItem")}>+ Add item</Button>
          ) : (
            <Button variant="outlined" color="inherit" onClick={clearAll}>Reset search</Button>
          )}
        </Box>
      ) : view === "index" ? (
        <Box>
          {results.map((item, i) => (
            <IndexRow key={item._id} item={item} index={i} onOpen={() => openItem(item)} />
          ))}
        </Box>
      ) : (
        <Box sx={{ mx: { xs: -2, sm: -4 }, pt: 3 }}>
          <Gallery>
            {results.map((item, i) =>
              item.source === "wishlist" ? (
                <WishlistItemCard key={item._id} item={item} index={i} onDeleteSuccess={getItems} />
              ) : (
                <ItemCard key={item._id} item={item} index={i} onDeleteSuccess={getItems} />
              )
            )}
          </Gallery>
        </Box>
      )}
    </Box>
  );
};

export default SearchItem;
