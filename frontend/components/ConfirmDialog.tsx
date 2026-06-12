"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Hapus",
  cancelText = "Batal",
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // Focus trap and Escape key listener (L5)
  useEffect(() => {
    if (isOpen) {
      // Safely default focus to the Cancel/safe button
      cancelRef.current?.focus();

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onCancel();
        } else if (e.key === "Tab") {
          if (document.activeElement === cancelRef.current && !e.shiftKey) {
            e.preventDefault();
            confirmRef.current?.focus();
          } else if (document.activeElement === confirmRef.current && e.shiftKey) {
            e.preventDefault();
            cancelRef.current?.focus();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative ios-card p-6 w-full max-w-[300px] text-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--red)]/10
                            flex items-center justify-center">
              <AlertTriangle size={24} className="text-[var(--red)]" />
            </div>
            <h3
              id="confirm-dialog-title"
              className="text-[17px] font-semibold text-[var(--text)] mb-1"
            >
              {title}
            </h3>
            <p
              id="confirm-dialog-desc"
              className="text-[13px] text-[var(--subtext)] mb-5"
            >
              {message}
            </p>

            <div className="flex flex-col gap-2">
              <button
                ref={confirmRef}
                onClick={onConfirm}
                className="w-full py-2.5 rounded-ios font-semibold text-[15px]
                           bg-[var(--red)] text-white active:scale-95 transition-all"
              >
                {confirmText}
              </button>
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="w-full py-2.5 rounded-ios font-medium text-[15px]
                           text-[var(--accent)] active:scale-95 transition-all"
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
