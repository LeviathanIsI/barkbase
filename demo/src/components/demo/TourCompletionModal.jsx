/**
 * TourCompletionModal Component
 *
 * Shown when the guided tour is completed. Congratulates the user
 * and encourages them to explore the interactive pages.
 */
import { useEffect, useRef } from 'react';
import { X, PartyPopper, Sparkles, MousePointerClick } from 'lucide-react';

/**
 * TourCompletionModal
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 */
export default function TourCompletionModal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-complete-title"
        className="relative w-full max-w-md animate-in fade-in zoom-in duration-300"
        style={{
          backgroundColor: '#1e293b',
          borderRadius: '16px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(245, 158, 11, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => e.target.style.color = '#94a3b8'}
          onMouseLeave={(e) => e.target.style.color = '#64748b'}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-6 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
          >
            <PartyPopper size={32} style={{ color: '#F59E0B' }} />
          </div>

          {/* Title */}
          <h2
            id="tour-complete-title"
            className="text-2xl font-bold mb-4"
            style={{ color: '#f1f5f9' }}
          >
            You're ready to explore!
          </h2>

          {/* Description */}
          <div className="space-y-4 mb-8" style={{ color: '#94a3b8' }}>
            <div className="flex items-start gap-3 text-left p-3 rounded-lg" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <Sparkles size={20} style={{ color: '#60A5FA', marginTop: '2px', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#cbd5e1' }}>
                Pages marked <span style={{ color: '#60A5FA' }}>"fully interactive"</span> let you create, edit, and delete data. Go ahead - play around!
              </p>
            </div>

            <div className="flex items-start gap-3 text-left p-3 rounded-lg" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <MousePointerClick size={20} style={{ color: '#F59E0B', marginTop: '2px', flexShrink: 0 }} />
              <p className="text-sm" style={{ color: '#cbd5e1' }}>
                Try inline editing on the Owner and Pet detail pages. Just click any field to update it!
              </p>
            </div>

            <p className="text-sm pt-2">
              When you're done, we'd love to hear what you think.
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-lg font-semibold text-base transition-all duration-200"
            style={{
              backgroundColor: '#F59E0B',
              color: '#000',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#FBBF24';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#F59E0B';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Start Exploring
          </button>

          {/* Footer hint */}
          <p className="mt-4 text-xs" style={{ color: '#64748b' }}>
            Press Esc or click outside to dismiss
          </p>
        </div>
      </div>
    </div>
  );
}
