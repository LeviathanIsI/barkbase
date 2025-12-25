/**
 * DemoBanner - Persistent banner showing demo mode status
 *
 * Shows different messages based on whether the current page is
 * interactive (full CRUD) or view-only (explore only)
 */
import { Eye, Sparkles } from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoModeContext';

export default function DemoBanner() {
  const { isViewOnly } = useDemoMode();

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: isViewOnly
          ? 'rgba(251, 146, 60, 0.15)' // Orange tint for view-only
          : 'rgba(59, 130, 246, 0.15)', // Blue tint for interactive
        color: isViewOnly
          ? '#FB923C' // Orange text
          : '#60A5FA', // Blue text
        borderBottom: `1px solid ${isViewOnly ? 'rgba(251, 146, 60, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
      }}
    >
      {isViewOnly ? (
        <>
          <Eye size={16} />
          <span>You are viewing a demo portal - This page is view-only</span>
        </>
      ) : (
        <>
          <Sparkles size={16} />
          <span>You are viewing a demo portal - Feel free to interact with this page!</span>
        </>
      )}
    </div>
  );
}
