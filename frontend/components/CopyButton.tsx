"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Props {
  text: string;
  label?: string;
  size?: "small" | "default";
}

export default function CopyButton({ text, label, size = "default" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    toast.success("Disalin! ✅");
    setTimeout(() => setCopied(false), 2000);
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
