/**
 * PageLoader - Full-page loading overlay
 * Used for initial app load, route transitions, and full-page operations
 *
 * Props:
 *  - message: string (e.g. "Loading BarkBase...")
 *  - variant: 'overlay' | 'inline' | 'minimal' (default: 'overlay')
 *  - showLogo: boolean (default: true)
 */

import { cn } from "@/lib/cn";
import { motion } from "framer-motion";

const PageLoader = ({
  message = "Loading...",
  variant = "overlay",
  showLogo = true,
  className = "",
}) => {
  // Minimal variant - just a progress bar at top
  if (variant === "minimal") {
    return (
      <div className={cn("fixed inset-x-0 top-0 z-50", className)}>
        <div className="h-1 w-full bg-[var(--bb-color-bg-elevated)] overflow-hidden">
          <motion.div
            className="h-full bg-[var(--bb-color-accent)]"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
            style={{ width: "30%" }}
          />
        </div>
      </div>
    );
  }

  // Inline variant - centered within container
  if (variant === "inline") {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center min-h-[400px] w-full",
        className
      )}>
        {showLogo && <LogoSpinner />}
        {message && (
          <p className="mt-4 text-sm text-[color:var(--bb-color-text-muted)]">
            {message}
          </p>
        )}
      </div>
    );
  }

  // Overlay variant (default) - full screen overlay
  return (
    <div className={cn(
      "fixed inset-0 z-50 flex flex-col items-center justify-center",
      "bg-[var(--bb-color-bg-body)]",
      className
    )}>
      {showLogo && <LogoSpinner size="lg" />}
      {message && (
        <p className="mt-6 text-sm text-[color:var(--bb-color-text-muted)]">
          {message}
        </p>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-[var(--bb-color-accent)]"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Logo with spinning animation
const LogoSpinner = ({ size = "md" }) => {
  const sizes = {
    sm: { container: 48, paw: 32 },
    md: { container: 72, paw: 48 },
    lg: { container: 96, paw: 64 },
  };

  const { container, paw } = sizes[size];

  return (
    <div className="relative" style={{ width: container, height: container }}>
      {/* Spinning ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-[var(--bb-color-accent)]"
        style={{ borderTopColor: "transparent" }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      />

      {/* Paw icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          width={paw}
          height={paw}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <ellipse cx="32" cy="40" rx="10" ry="6" fill="var(--bb-color-accent)" />
          <ellipse cx="23" cy="26" rx="4.5" ry="6" fill="var(--bb-color-accent)" />
          <ellipse cx="32" cy="22" rx="4.5" ry="6" fill="var(--bb-color-accent)" />
          <ellipse cx="41" cy="26" rx="4.5" ry="6" fill="var(--bb-color-accent)" />
        </svg>
      </div>
    </div>
  );
};

export default PageLoader;
export { LogoSpinner };
