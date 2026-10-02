import React from "react";
import { SignIn, SignUp } from "@clerk/react";
import Box from "@mui/material/Box";

const centered = { display: "flex", justifyContent: "center", mt: 8 };

export const SignInPage = () => (
  <Box sx={centered}>
    <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
  </Box>
);

export const SignUpPage = () => (
  <Box sx={centered}>
    <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
  </Box>
);
