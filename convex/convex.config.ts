import presence from "@convex-dev/presence/convex.config.js";
import staticHosting from "@convex-dev/static-hosting/convex.config";
import { defineApp } from "convex/server";

// The static site owns "/" on <deployment>.convex.site; any convex/http.ts routes live under /api.
const app = defineApp({ httpPrefix: "/api" });
app.use(presence);
app.use(staticHosting, { httpPrefix: "/" });
export default app;
