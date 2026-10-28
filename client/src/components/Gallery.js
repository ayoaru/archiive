import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { monoLabel } from "../theme";

// Shared page title row: italic serif title, mono count, optional action
export const PageHeader = ({ title, count, countLabel = "pieces", action }) => (
  <Stack
    direction="row"
    alignItems="flex-end"
    justifyContent="space-between"
    sx={{ px: { xs: 2, sm: 4 }, pt: 5, pb: 3 }}
  >
    <Typography variant="h4" component="h1" sx={{ fontSize: { xs: 36, sm: 48 } }}>
      {title}
    </Typography>
    <Stack direction="row" alignItems="center" gap={2}>
      {count !== undefined && (
        <Typography sx={{ ...monoLabel, color: "text.secondary" }}>
          {String(count).padStart(3, "0")} {countLabel}
        </Typography>
      )}
      {action}
    </Stack>
  </Stack>
);

// Responsive tile grid for item and outfit cards
export const Gallery = ({ children }) => (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 4,
      px: { xs: 2, sm: 4 },
      pb: 6,
    }}
  >
    {children}
  </Box>
);

// Catalogue number, e.g. 1 -> "001"
export const catalogNo = (index) => String(index + 1).padStart(3, "0");
