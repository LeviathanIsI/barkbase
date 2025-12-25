/**
 * DemoGateModal Component
 *
 * Welcome modal shown to first-time visitors. Once completed,
 * triggers the guided tour automatically.
 */
import { useState, useEffect, useRef } from 'react';
import { Play, Eye, X } from 'lucide-react';

// Session storage key
const GATE_COMPLETED_KEY = 'barkbase_demo_gate_completed';

/**
 * DemoGateModal
 * @param {Object} props
 * @param {Function} props.onComplete - Callback when user completes the gate (starts tour)
 * @param {Function} props.onSkip - Callback when user skips (explores without tour)
 */
export default function DemoGateModal({ onComplete, onSkip }) {
  const [isVisible, setIsVisible] = useState(false);
  const modalRef = useRef(null);

  // Check if gate was already completed
  useEffect(() => {
    if (!sessionStorage.getItem(GATE_COMPLETED_KEY)) {
      // Small delay for page to load
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Focus trap
  useEffect(() => {
    if (isVisible && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isVisible]);

  const handleStartTour = () => {
    sessionStorage.setItem(GATE_COMPLETED_KEY, 'true');
    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem(GATE_COMPLETED_KEY, 'true');
    setIsVisible(false);
    if (onSkip) {
      onSkip();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
        className="relative w-full max-w-lg animate-in fade-in zoom-in duration-300"
        style={{
          backgroundColor: '#0f172a',
          borderRadius: '20px',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 60px rgba(245, 158, 11, 0.1)',
        }}
      >
        {/* Header decoration */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-[20px]"
          style={{
            background: 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)',
          }}
        />

        {/* Content */}
        <div className="p-8">
          {/* Logo/Brand */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 mb-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#F59E0B' }}
              >
                <span className="text-xl">B</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>
                BarkBase
              </span>
            </div>
            <h1
              id="gate-title"
              className="text-xl font-semibold mb-2"
              style={{ color: '#f1f5f9' }}
            >
              Welcome to the Demo Portal
            </h1>
            <p style={{ color: '#94a3b8' }}>
              See why kennel owners are switching to BarkBase
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3 mb-8">
            <FeatureItem
              emoji="*"
              title="Inline Editing Everywhere"
              description="Click any field to edit - no forms, no friction"
            />
            <FeatureItem
              emoji="*"
              title="Do Most Things From Any Screen"
              description="Complete most tasks without leaving your current page"
            />
            <FeatureItem
              emoji="*"
              title="Automation Included"
              description="No extra fees for workflows and reminders"
            />
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleStartTour}
              className="w-full py-3.5 px-6 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                backgroundColor: '#F59E0B',
                color: '#000',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FBBF24';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(245, 158, 11, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F59E0B';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Play size={18} />
              Take the Guided Tour
            </button>

            <button
              onClick={handleSkip}
              className="w-full py-3 px-6 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: '#64748b',
                border: '1px solid #334155',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#475569';
                e.currentTarget.style.color = '#94a3b8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#334155';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <Eye size={16} />
              Skip - I'll explore on my own
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
            All data is demo data. Feel free to create, edit, and delete!
          </p>
        </div>
      </div>
    </div>
  );
}

// Feature item component
function FeatureItem({ emoji, title, description }) {
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg"
      style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
    >
      <span className="text-lg" style={{ color: '#F59E0B' }}>{emoji}</span>
      <div>
        <p className="font-medium text-sm" style={{ color: '#f1f5f9' }}>{title}</p>
        <p className="text-xs" style={{ color: '#94a3b8' }}>{description}</p>
      </div>
    </div>
  );
}

// Export utility to check if gate should show
export const shouldShowGate = () => {
  return !sessionStorage.getItem(GATE_COMPLETED_KEY);
};

// Export utility to reset gate
export const resetGate = () => {
  sessionStorage.removeItem(GATE_COMPLETED_KEY);
};
