/**
 * DraggableStep - Wrapper component for drag-to-reorder functionality
 * Uses HTML5 drag and drop API for step reordering
 */
import { useState, useRef } from 'react';
import { cn } from '@/lib/cn';

export default function DraggableStep({
  children,
  step,
  index,
  onReorder,
  isDraggable = true,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragRef = useRef(null);

  const handleDragStart = (e) => {
    if (!isDraggable) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      stepId: step.id,
      sourceIndex: index,
    }));

    // Add slight delay for visual feedback
    requestAnimationFrame(() => {
      if (dragRef.current) {
        dragRef.current.style.opacity = '0.5';
      }
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragOver(false);
    if (dragRef.current) {
      dragRef.current.style.opacity = '1';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only show drag over state if this is a different step
    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        const { stepId } = JSON.parse(data);
        if (stepId !== step.id) {
          setIsDragOver(true);
        }
      }
    } catch {
      // getData may fail during dragover in some browsers
      setIsDragOver(true);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only clear if we're leaving the container entirely
    if (!dragRef.current?.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    try {
      const data = e.dataTransfer.getData('text/plain');
      if (data) {
        const { stepId, sourceIndex } = JSON.parse(data);
        if (stepId !== step.id && sourceIndex !== index) {
          onReorder(stepId, index);
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div
      ref={dragRef}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center transition-all duration-150',
        isDraggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        isDragOver && 'transform scale-[1.02]'
      )}
    >
      {/* Drop indicator line */}
      {isDragOver && (
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-48 h-0.5 bg-[var(--bb-color-accent)] rounded-full z-10" />
      )}

      {children}
    </div>
  );
}
