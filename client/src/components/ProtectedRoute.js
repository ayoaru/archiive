import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@clerk/react";
import NavBar from "./NavBar";

// Layout for every signed-in page: sends signed-out users to /sign-in.
const ProtectedRoute = () => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;

  return (
    <React.Fragment>
      <NavBar />
      <Outlet />
    </React.Fragment>
  );
};

export default ProtectedRoute;
