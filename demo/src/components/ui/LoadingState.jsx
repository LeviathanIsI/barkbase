import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import Skeleton from "./skeleton/Skeleton";

/**
 * LoadingState
 *
 * Props:
 *  - label: string (e.g. "Loading Pets…")
 *  - variant: 'mascot' | 'skeleton' | 'spinner' | 'inline'  (default: 'mascot')
 *  - size: 'sm' | 'md' | 'lg' (default: 'md')
 *  - className: extra tailwind classes for container
 *
 * Usage:
 *  <LoadingState label="Loading Pets…" variant="mascot" />
 *  <LoadingState variant="spinner" size="sm" />
 *  <LoadingState variant="inline" label="Saving..." />
 */
export default function LoadingState({
  label = "Loading…",
  variant = "mascot",
  size = "md",
  className = ""
}) {
  // Inline variant - small spinner with text, for inline async actions
  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-[color:var(--bb-color-text-muted)]", className)}>
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        {label && <span className="text-sm">{label}</span>}
      </span>
    );
  }

  // Skeleton variant - placeholder blocks
  if (variant === "skeleton") {
    return (
      <div className={cn("w-full py-8", className)}>
        <div className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Spinner variant - centered spinner with label
  if (variant === "spinner") {
    const spinnerSizes = {
      sm: "h-6 w-6",
      md: "h-10 w-10",
      lg: "h-14 w-14",
    };
    const paddingSizes = {
      sm: "py-6",
      md: "py-10",
      lg: "py-16",
    };

    return (
      <div className={cn(
        "flex flex-col items-center justify-center text-center",
        paddingSizes[size],
        className
      )}>
        <svg
          className={cn("animate-spin text-[color:var(--bb-color-text-muted)] mb-3", spinnerSizes[size])}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        {label && <div className="text-sm text-[color:var(--bb-color-text-muted)]">{label}</div>}
      </div>
    );
  }

  // Mascot (default) — Framer Motion animated paw
  const pawVariants = {
    bounce: {
      y: [0, -10, 0],
      rotate: [-6, 6, -4],
      transition: { duration: 1.0, repeat: Infinity, ease: "easeInOut" }
    },
    idle: { y: 0, rotate: -4 },
  };

  const mascotSizes = {
    sm: { svg: 48, py: "py-6" },
    md: { svg: 72, py: "py-10" },
    lg: { svg: 96, py: "py-16" },
  };

  const sizeConfig = mascotSizes[size];

  return (
    <div className={cn("flex flex-col items-center justify-center text-center", sizeConfig.py, className)}>
      <motion.div
        className="relative mb-4"
        initial="idle"
        animate="bounce"
        variants={pawVariants}
        aria-hidden="true"
      >
        <svg
          width={sizeConfig.svg}
          height={sizeConfig.svg}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="30" fill="var(--bb-color-bg-elevated)" opacity="0.5" />
          <ellipse cx="32" cy="40" rx="10" ry="6" fill="var(--bb-color-text-muted)" />
          <ellipse cx="23" cy="26" rx="4.5" ry="6" fill="var(--bb-color-text-muted)" />
          <ellipse cx="32" cy="22" rx="4.5" ry="6" fill="var(--bb-color-text-muted)" />
          <ellipse cx="41" cy="26" rx="4.5" ry="6" fill="var(--bb-color-text-muted)" />
        </svg>
      </motion.div>

      {label && <div className="text-sm text-[color:var(--bb-color-text-muted)]">{label}</div>}
    </div>
  );
}
