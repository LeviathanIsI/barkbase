import React from "react";
import { motion } from "framer-motion";

/**
 * LoadingState
 *
 * Props:
 *  - label: string (e.g. "Loading Pets…")
 *  - variant: 'mascot' | 'skeleton' | 'spinner'  (default: 'mascot')
 *  - className: extra tailwind classes for container
 *
 * Usage:
 *  <LoadingState label="Loading Pets…" variant="mascot" />
 */
export default function LoadingState({ label = "Loading…", variant = "mascot", className = "" }) {
  if (variant === "skeleton") {
    return (
      <div className={`w-full py-8 ${className}`}>
        <div className="space-y-3">
          <div className="h-6 bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
          <div className="h-48 bg-gray-800 rounded animate-pulse w-full"></div>
        </div>
      </div>
    );
  }

  if (variant === "spinner") {
    return (
      <div className={`flex flex-col items-center justify-center text-center py-10 ${className}`}>
        <svg className="animate-spin h-10 w-10 text-gray-400 mb-3" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <div className="text-sm text-gray-300">{label}</div>
      </div>
    );
  }

  // mascot (default) — Framer Motion animated paw
  const pawVariants = {
    bounce: { y: [0, -10, 0], rotate: [-6, 6, -4], transition: { duration: 1.0, repeat: Infinity, ease: "easeInOut" } },
    idle: { y: 0, rotate: -4 },
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 ${className}`}>
      <motion.div
        className="relative mb-4"
        initial="idle"
        animate="bounce"
        variants={pawVariants}
        aria-hidden="true"
      >
        <svg width="72" height="72" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" className="text-gray-800" fill="currentColor" opacity="0.06" />
          <ellipse cx="32" cy="40" rx="10" ry="6" fill="currentColor" className="text-gray-300" />
          <ellipse cx="23" cy="26" rx="4.5" ry="6" fill="currentColor" className="text-gray-300" />
          <ellipse cx="32" cy="22" rx="4.5" ry="6" fill="currentColor" className="text-gray-300" />
          <ellipse cx="41" cy="26" rx="4.5" ry="6" fill="currentColor" className="text-gray-300" />
        </svg>
      </motion.div>

      <div className="text-sm text-gray-300">{label}</div>
    </div>
  );
}
