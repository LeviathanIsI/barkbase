import App from "@/App";
import ErrorBoundary from "@/app/ErrorBoundary";
import "@/index.css";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { initSentry, Sentry } from "@/lib/sentry";

// Initialize Sentry before rendering
initSentry();

if ("serviceWorker" in navigator) {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")).render(
  <Sentry.ErrorBoundary
    fallback={({ resetError }) => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We&apos;ve been notified and are working on a fix.
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )}
    onError={(error) => {
      console.error("Caught by Sentry ErrorBoundary:", error);
    }}
  >
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </Sentry.ErrorBoundary>
);
