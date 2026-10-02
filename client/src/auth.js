import { useLayoutEffect } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

// Clerk's getToken, set once the provider is ready. Kept at module level so a
// single axios interceptor can attach the session token to every request.
let getToken = null;

axios.interceptors.request.use(async (config) => {
  const token = getToken ? await getToken() : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Hands Clerk's getToken to the interceptor above. A layout effect runs before
// any child's useEffect, so the token is in place before pages fetch data.
export const AxiosAuth = () => {
  const { getToken: clerkGetToken } = useAuth();

  useLayoutEffect(() => {
    getToken = clerkGetToken;
    return () => {
      getToken = null;
    };
  }, [clerkGetToken]);

  return null;
};
