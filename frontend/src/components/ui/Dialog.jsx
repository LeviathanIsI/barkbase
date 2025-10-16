import { cn } from "@/lib/cn";
import { useEffect, useRef } from "react";

const Dialog = ({ open, onOpenChange, children }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onOpenChange?.(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onOpenChange?.(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/80" />

      {/* Dialog - REMOVED max-w-lg constraint, it's now set per usage */}
      <div className="fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] p-4">
        <div ref={dialogRef}>{children}</div>
      </div>
    </>
  );
};

// THIS is where the styling happens - NO max-height, NO overflow
const DialogContent = ({ className, children, ...props }) => (
  <div
    className={cn(
      "bg-white rounded-lg shadow-xl border border-[#E0E0E0] mx-auto",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("p-6 border-b border-[#E0E0E0]", className)} {...props} />
);

const DialogTitle = ({ className, ...props }) => (
  <h2
    className={cn("text-2xl font-semibold text-[#263238] mb-2", className)}
    {...props}
  />
);

const DialogDescription = ({ className, ...props }) => (
  <p className={cn("text-sm text-[#64748B]", className)} {...props} />
);

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn(
      "p-6 border-t border-[#E0E0E0] flex justify-end gap-2",
      className
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};

export default Dialog;
