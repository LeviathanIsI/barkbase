/**
 * Demo Mode Banner
 *
 * Fixed banner at the top of the page indicating demo mode.
 * Uses BarkBase primary (amber) color scheme.
 */

import { Monitor } from 'lucide-react';

export function DemoModeBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] bg-primary-600 text-white"
      role="banner"
      aria-label="Demo mode indicator"
    >
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
        <Monitor className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
        <span>You're viewing an interactive demo of BarkBase</span>
      </div>
    </div>
  );
}

export default DemoModeBanner;
