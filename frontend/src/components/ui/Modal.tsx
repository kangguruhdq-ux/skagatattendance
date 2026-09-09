import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, GripHorizontal } from "lucide-react";
import clsx from "clsx";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  draggable?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showCloseButton = true,
  draggable = true,
}: ModalProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, initialX: 0, initialY: 0 });

  // Reset position whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Drag handlers
  const handleStartDrag = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      if (!draggable) return;
      // Do not initiate drag if user clicked a button or close icon
      if (target.closest("button") || target.closest("input") || target.closest("a")) {
        return;
      }
      dragStartRef.current = {
        mouseX: clientX,
        mouseY: clientY,
        initialX: offset.x,
        initialY: offset.y,
      };
      setIsDragging(true);
    },
    [draggable, offset]
  );

  useEffect(() => {
    if (!isDragging) return;

    function handleMouseMove(e: MouseEvent) {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      // Bound drag inside screen boundaries so modal is never lost
      const maxX = window.innerWidth / 2 - 80;
      const maxY = window.innerHeight / 2 - 60;
      const newX = Math.max(-maxX, Math.min(maxX, dragStartRef.current.initialX + dx));
      const newY = Math.max(-maxY, Math.min(maxY, dragStartRef.current.initialY + dy));

      setOffset({ x: newX, y: newY });
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.mouseX;
      const dy = touch.clientY - dragStartRef.current.mouseY;

      const maxX = window.innerWidth / 2 - 80;
      const maxY = window.innerHeight / 2 - 60;
      const newX = Math.max(-maxX, Math.min(maxX, dragStartRef.current.initialX + dx));
      const newY = Math.max(-maxY, Math.min(maxY, dragStartRef.current.initialY + dy));

      setOffset({ x: newX, y: newY });
    }

    function handleEnd() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  const sizeMap = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    full: "max-w-4xl",
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto pointer-events-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          transform:
            offset.x !== 0 || offset.y !== 0
              ? `translate3d(${offset.x}px, ${offset.y}px, 0)`
              : undefined,
          transition: isDragging ? "none" : "transform 0.15s ease-out",
        }}
        className={clsx(
          "relative w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl shadow-slate-900/20 dark:shadow-black/70",
          "z-10 my-auto text-slate-800 dark:text-slate-100 overflow-hidden",
          sizeMap[size]
        )}
      >
        {(title || showCloseButton) && (
          <div
            onMouseDown={(e) => handleStartDrag(e.clientX, e.clientY, e.target as HTMLElement)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleStartDrag(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
              }
            }}
            className={clsx(
              "flex items-start justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 select-none",
              draggable && "cursor-grab active:cursor-grabbing"
            )}
          >
            <div className="flex items-start gap-2.5 min-w-0 pr-2">
              {draggable && (
                <div
                  className="mt-0.5 p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
                  title="Klik dan geser untuk memindahkan posisi dialog"
                >
                  <GripHorizontal size={18} />
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {description}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;
