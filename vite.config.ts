import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

// Workers AI (used to read attachments) only runs remotely. Plain `npm run dev` works without a
// Cloudflare login (chat works, attachment reading returns an error); run
// `PIP_REMOTE=1 npm run dev` after `npx wrangler login` to read images/files locally too.
const remote = process.env.PIP_REMOTE === "1";

export default defineConfig({
  plugins: [react(), cloudflare({ remoteBindings: remote })],
});
