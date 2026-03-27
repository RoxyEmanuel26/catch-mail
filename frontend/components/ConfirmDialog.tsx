"use client";

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
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--red)]/10
                            flex items-center justify-center">
              <AlertTriangle size={24} className="text-[var(--red)]" />
            </div>
            <h3 className="text-[17px] font-semibold text-[var(--text)] mb-1">
              {title}
            </h3>
            <p className="text-[13px] text-[var(--subtext)] mb-5">{message}</p>

            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirm}
                className="w-full py-2.5 rounded-ios font-semibold text-[15px]
                           bg-[var(--red)] text-white active:scale-95 transition-all"
              >
                {confirmText}
              </button>
              <button
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
