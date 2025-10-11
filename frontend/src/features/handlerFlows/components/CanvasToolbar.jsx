import Button from '@/components/ui/Button';

const CanvasToolbar = ({
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoomLevel = 100,
  onToggleMinimap,
  showMinimap = true,
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 h-10 bg-background/95 border-b border-border z-10 flex items-center justify-between px-4">
      {/* Left Side: Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="p-1.5 hover:bg-surface rounded transition-colors"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        <button
          onClick={onZoomReset}
          className="px-2 py-1 text-xs font-medium hover:bg-surface rounded transition-colors min-w-[50px]"
          aria-label="Reset zoom"
          title="Reset zoom to 100%"
        >
          {zoomLevel}%
        </button>

        <button
          onClick={onZoomIn}
          className="p-1.5 hover:bg-surface rounded transition-colors"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="h-4 w-px bg-border mx-2" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMinimap}
          className="text-xs"
        >
          {showMinimap ? 'Hide' : 'Show'} minimap panel
        </Button>
      </div>

      {/* Right Side: Additional Controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">
          Use Clone/Move/Delete controls to reorder steps
        </span>
      </div>
    </div>
  );
};

export default CanvasToolbar;
