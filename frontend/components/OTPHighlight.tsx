"use client";

import { toast } from "sonner";

interface Props {
  text: string;
}

export default function OTPHighlight({ text }: Props) {
  if (!text) return null;

  const parts = text.split(/(\b\d{4,8}\b)/g);

  return (
    <pre className="whitespace-pre-wrap text-sm text-[var(--text)] font-mono leading-relaxed">
      {parts.map((part, i) =>
        /^\d{4,8}$/.test(part) ? (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 rounded-md font-bold cursor-pointer
                       hover:opacity-80 transition-opacity bg-yellow-200 dark:bg-yellow-900/40
                       text-yellow-800 dark:text-yellow-200 border border-yellow-300
                       dark:border-yellow-700/50"
            onClick={() => {
              navigator.clipboard.writeText(part);
              toast.success(`Kode ${part} disalin!`);
            }}
            title="Klik untuk menyalin"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </pre>
  );
}
