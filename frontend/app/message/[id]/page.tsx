"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { fetchMessage, deleteMessage } from "@/lib/api";
import { isAuthenticated, formatTimeAgo } from "@/lib/auth";
import CopyButton from "@/components/CopyButton";
import OTPHighlight from "@/components/OTPHighlight";

export default function MessagePage() {
  const router = useRouter();
  const params = useParams();
  const messageId = params?.id as string;

  useEffect(() => {
    if (!isAuthenticated()) router.push("/");
  }, [router]);

  const { data: msg, isLoading, error } = useQuery({
    queryKey: ["message", messageId],
    queryFn: () => fetchMessage(messageId),
    enabled: !!messageId,
  });

  async function handleDelete() {
    if (!confirm("Hapus pesan ini?")) return;
    try {
      await deleteMessage(messageId);
      toast.success("Pesan dihapus");
      router.push("/inbox");
    } catch {
      toast.error("Gagal menghapus pesan");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Memuat pesan...</p>
        </div>
      </div>
    );
  }

  if (error || !msg) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-zinc-400">Pesan tidak ditemukan</p>
          <button onClick={() => router.push("/inbox")} className="btn-primary mt-4">
            ← Kembali ke Inbox
          </button>
        </div>
      </div>
    );
  }

  // Split OTP digits for display
  const otpDigits = msg.otp_detected ? msg.otp_detected.split("") : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60"
        style={{ background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.push("/inbox")} className="btn-ghost text-sm">
            ← Kembali
          </button>
          <button onClick={handleDelete} className="btn-danger text-sm">
            🗑️ Hapus
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Message Header */}
        <div className="glass-card p-6 mb-4 animate-fade-in-up">
          <h1 className="text-xl font-bold text-zinc-100 mb-4">{msg.subject}</h1>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-zinc-600 w-16">Dari</span>
              <span className="text-zinc-300 font-medium">
                {msg.from_name && (
                  <span className="text-zinc-100">{msg.from_name} </span>
                )}
                &lt;{msg.from_address}&gt;
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-600 w-16">Kepada</span>
              <span className="text-emerald-400 font-medium">{msg.to_address}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-600 w-16">Waktu</span>
              <span className="text-zinc-400">{formatTimeAgo(msg.received_at)}</span>
            </div>
          </div>
        </div>

        {/* OTP Card */}
        {msg.otp_detected && (
          <div className="mb-4 p-6 rounded-2xl animate-fade-in-up"
            style={{
              background: "linear-gradient(135deg, rgba(5, 150, 105, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}>
            <div className="text-center">
              <p className="text-emerald-400 font-semibold text-sm mb-4 flex items-center justify-center gap-2">
                🔑 Kode OTP Terdeteksi
              </p>

              <div className="flex justify-center gap-2 mb-5">
                {otpDigits.map((digit, i) => (
                  <div
                    key={i}
                    className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold text-emerald-300"
                    style={{
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}>
                    {digit}
                  </div>
                ))}
              </div>

              <CopyButton text={msg.otp_detected} label="📋 Salin Kode" />
            </div>
          </div>
        )}

        {/* Email Body */}
        <div className="glass-card overflow-hidden animate-fade-in-up">
          <div className="p-1">
            {msg.body_html ? (
              <iframe
                sandbox="allow-same-origin"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <style>
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                        color: #e4e4e7;
                        background: #1c1c21;
                        padding: 20px;
                        font-size: 14px;
                        line-height: 1.6;
                        margin: 0;
                      }
                      a { color: #34d399; }
                      img { max-width: 100%; height: auto; }
                      table { max-width: 100%; }
                    </style>
                  </head>
                  <body>${msg.body_html}</body>
                  </html>
                `}
                className="w-full border-none"
                style={{ minHeight: "300px", borderRadius: "12px" }}
                title="Email content"
              />
            ) : msg.body_text ? (
              <div className="p-5">
                <OTPHighlight text={msg.body_text} />
              </div>
            ) : (
              <div className="p-5 text-center text-zinc-600">
                <p>Tidak ada konten email</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
