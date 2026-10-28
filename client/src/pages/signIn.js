import React from "react";
import { SignIn, SignUp } from "@clerk/react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { SERIF } from "../theme";
import ModeToggle from "../components/ModeToggle";

const centered = { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, mt: 10 };

const Wordmark = () => (
  <Typography sx={{ fontFamily: SERIF, fontSize: 40 }}>
    archiive<Box component="span" sx={{ color: "primary.main" }}>.</Box>
  </Typography>
);

export const SignInPage = () => (
  <Box sx={centered}>
    <ModeToggle sx={{ position: "absolute", top: 16, right: 16 }} />
    <Wordmark />
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
  </Box>
);

export const SignUpPage = () => (
  <Box sx={centered}>
    <ModeToggle sx={{ position: "absolute", top: 16, right: 16 }} />
    <Wordmark />
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
  </Box>
);
