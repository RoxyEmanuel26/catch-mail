"use client";

interface Props {
  text: string;
}

export default function OTPHighlight({ text }: Props) {
  if (!text) return null;

  // Highlight 4-8 digit sequences
  const parts = text.split(/(\b\d{4,8}\b)/g);

  return (
    <pre className="whitespace-pre-wrap text-sm text-zinc-300 font-mono leading-relaxed">
      {parts.map((part, i) =>
        /^\d{4,8}$/.test(part) ? (
          <span
            key={i}
            className="inline-block px-1.5 py-0.5 rounded font-bold cursor-pointer hover:opacity-80 transition-opacity"
            style={{
              background: "rgba(250, 204, 21, 0.2)",
              color: "#fde047",
              border: "1px solid rgba(250, 204, 21, 0.3)",
            }}
            onClick={() => {
              navigator.clipboard.writeText(part);
            }}
            title="Klik untuk menyalin">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </pre>
  );
}
