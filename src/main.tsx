// base.css must load before the page stylesheets imported by App, so pages can override it.
import "./styles/base.css";
import { createRoot } from "react-dom/client";
import App from "./App";

// No <StrictMode>: its dev-only double mount leaves nested GSAP pin-spacers behind,
// so dev would behave differently from production.
createRoot(document.getElementById("root")!).render(<App />);
