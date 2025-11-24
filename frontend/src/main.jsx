import App from "@/App";
import ErrorBoundary from "@/app/ErrorBoundary";
import "@/index.css";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
