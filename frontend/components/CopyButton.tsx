"use client";

import { useState } from "react";

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (size === "small") {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
        className="text-zinc-500 hover:text-emerald-400 transition-colors p-0.5"
        title="Salin">
        {copied ? (
          <span className="text-emerald-400 text-xs">✅</span>
        ) : (
          <span className="text-xs">📋</span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-primary text-sm">
      {copied ? "✅ Disalin!" : label || "📋 Salin"}
    </button>
  );
}
