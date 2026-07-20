import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import "./index.css";
import App from "./App.jsx";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Handle the OAuth redirect callback at /sso-callback — Clerk processes the
// OAuth code here and then redirects to the root. All other paths render App.
const isSsoCallback = window.location.pathname === "/sso-callback";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      {isSsoCallback
        ? <AuthenticateWithRedirectCallback />
        : <App />
      }
    </ClerkProvider>
  </StrictMode>
);
