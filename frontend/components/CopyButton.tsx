"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface Props {
  text: string;
  label?: string;
  size?: "small" | "default";
}

export default function CopyButton({ text, label, size = "default" }: Props) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount to prevent memory leaks (M15)
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success("Disalin! ✅");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Gagal menyalin teks");
    }
  }

  if (size === "small") {
    return (
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleCopy();
        }}
        whileTap={{ scale: 0.8 }}
        className="p-1 rounded-md text-[var(--subtext)] hover:text-[var(--accent)]
                   hover:bg-[var(--card2)] transition-all"
        title="Salin"
      >
        {copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={handleCopy}
      whileTap={{ scale: 0.95 }}
      className="ios-btn-primary text-sm"
    >
      {copied ? (
        <>
          <Check size={16} />
          Disalin!
        </>
      ) : (
        <>
          <Copy size={16} />
          {label || "Salin"}
        </>
      )}
    </motion.button>
  );
}
