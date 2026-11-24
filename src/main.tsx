import { DatabuddyProvider } from "@databuddy/sdk/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
    {/* Outgoing links on: the lounge sends people to Apple Music and Luma. */}
    <DatabuddyProvider
      clientId={import.meta.env.VITE_DATABUDDY_CLIENT_ID}
      autocapture={{ webVitals: true, errors: true, outgoingLinks: true }}
      replay
    />
  </StrictMode>,
);
