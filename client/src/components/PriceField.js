import React from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Box from "@mui/material/Box";
import { CURRENCIES, currencySymbol } from "../profile";
import { monoLabel } from "../theme";

// Price input with the currency it's listed in. The currency is a compact
// select at the start of the field; an unlisted code (e.g. from a scraped
// store) is kept as an extra option rather than silently changed.
const PriceField = ({ price, currency, onPriceChange, onCurrencyChange }) => {
  const codes = CURRENCIES.map((c) => c.code);
  const options = codes.includes(currency) ? codes : [currency, ...codes];

  return (
    <TextField
      label="Price"
      variant="outlined"
      value={price}
      name="price"
      onChange={onPriceChange}
      inputProps={{ inputMode: "decimal" }}
      InputLabelProps={{ shrink: true }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 1 }}>
            <Box
              component="select"
              aria-label="Price currency"
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
              sx={{
                ...monoLabel,
                bgcolor: "transparent",
                color: "text.primary",
                border: 0,
                borderRight: 1,
                borderColor: "divider",
                pr: 0.5,
                mr: 0.5,
                cursor: "pointer",
                "& option": { bgcolor: "background.paper", color: "text.primary" },
              }}
            >
              {options.map((code) => (
                <option key={code} value={code}>
                  {code} {currencySymbol(code)}
                </option>
              ))}
            </Box>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PriceField;
