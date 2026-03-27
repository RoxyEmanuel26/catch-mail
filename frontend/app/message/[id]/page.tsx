"use client";

import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchMessage, deleteMessage } from "@/lib/api";
import { isAuthenticated, formatTimeAgo } from "@/lib/auth";
import { getColorFromEmail } from "@/lib/utils";
import CopyButton from "@/components/CopyButton";
import OTPHighlight from "@/components/OTPHighlight";
import ThemeToggle from "@/components/ThemeToggle";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ChevronLeft, Trash2, KeyRound, Clock, Mail, Copy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function MessagePage() {
  const router = useRouter();
  const params = useParams();
  const messageId = params?.id as string;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) router.push("/");
  }, [router]);

  const { data: msg, isLoading, error } = useQuery({
    queryKey: ["message", messageId],
    queryFn: () => fetchMessage(messageId),
    enabled: !!messageId,
  });

  async function handleDelete() {
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[var(--accent)] mx-auto mb-3" />
          <p className="text-[var(--subtext)] text-sm">Memuat pesan...</p>
        </div>
      </div>
    );
  }

  if (error || !msg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-5xl mb-4">😵</div>
          <p className="text-[var(--subtext)] mb-4">Pesan tidak ditemukan</p>
          <button
            onClick={() => router.push("/inbox")}
            className="ios-btn-primary"
          >
            <ChevronLeft size={16} />
            Kembali ke Inbox
          </button>
        </motion.div>
      </div>
    );
  }

  const otpDigits = msg.otp_detected ? msg.otp_detected.split("") : [];

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/inbox")}
            className="ios-btn-secondary !py-2 !px-3 text-sm"
          >
            <ChevronLeft size={16} />
            Kembali
          </motion.button>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteConfirm(true)}
              className="ios-btn-secondary !py-2 !px-3 text-sm text-[var(--red)]
                         border-[var(--red)]/30 hover:bg-[var(--red)]/10"
            >
              <Trash2 size={16} />
              Hapus
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Message Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-card p-6"
        >
          {/* Sender info */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center
                          text-white font-bold text-lg flex-shrink-0"
              style={{ background: getColorFromEmail(msg.from_address) }}
            >
              {msg.from_name?.[0]?.toUpperCase() ??
                msg.from_address[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[var(--text)]">
                {msg.from_name || msg.from_address}
              </p>
              <p className="text-sm text-[var(--subtext)]">
                {msg.from_address}
              </p>
            </div>
          </div>

          {/* Subject */}
          <h1 className="text-xl font-bold text-[var(--text)] mb-4">
            {msg.subject}
          </h1>

          {/* Metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-[var(--subtext)]">
              <Mail size={14} />
              <span>Kepada:</span>
              <span className="text-[var(--accent)] font-medium">
                {msg.to_address}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[var(--subtext)]">
              <Clock size={14} />
              <span>{formatTimeAgo(msg.received_at)}</span>
            </div>
          </div>
        </motion.div>

        {/* OTP Hero Card */}
        {msg.otp_detected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="ios-card p-6 border-2 border-[var(--green)]/40
                       bg-[var(--green)]/5 shadow-glow-green"
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-ios bg-[var(--green)] flex items-center
                            justify-center"
              >
                <KeyRound size={16} className="text-white" />
              </div>
              <span className="font-semibold text-[var(--green)]">
                Kode OTP Terdeteksi
              </span>
            </div>

            {/* OTP digits */}
            <div className="flex justify-center gap-2 mb-4">
              {otpDigits.map((digit: string, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-12 h-14 flex items-center justify-center
                             bg-[var(--card)] rounded-ios border-2
                             border-[var(--green)]/30 font-mono font-bold
                             text-2xl text-[var(--green)] shadow-ios-sm"
                >
                  {digit}
                </motion.div>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                navigator.clipboard.writeText(msg.otp_detected || "");
                toast.success("Kode OTP disalin! ✅");
              }}
              className="w-full ios-btn-primary !bg-[var(--green)] hover:!bg-[var(--green)]/90"
            >
              <Copy size={16} />
              Salin Kode OTP
            </motion.button>
          </motion.div>
        )}

        {/* Email Body */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-xs font-semibold text-[var(--subtext)] uppercase tracking-wider mb-2 px-1">
            Isi Email
          </p>
          <div className="ios-card overflow-hidden">
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
                        color: #333;
                        background: #fff;
                        padding: 20px;
                        font-size: 14px;
                        line-height: 1.6;
                        margin: 0;
                      }
                      a { color: #007AFF; }
                      img { max-width: 100%; height: auto; }
                      table { max-width: 100%; }
                      @media (prefers-color-scheme: dark) {
                        body { color: #e4e4e7; background: #1C1C1E; }
                        a { color: #0A84FF; }
                      }
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
              <div className="p-5 text-center text-[var(--subtext)]">
                <p>Tidak ada konten email</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Footer actions */}
        <div className="flex gap-3 pb-8">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/inbox")}
            className="ios-btn-secondary flex-1"
          >
            <ChevronLeft size={16} />
            Kembali
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDeleteConfirm(true)}
            className="ios-btn-secondary flex-1 text-[var(--red)]
                       border-[var(--red)]/30 hover:bg-[var(--red)]/10"
          >
            <Trash2 size={16} />
            Hapus
          </motion.button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Hapus Pesan?"
        message="Pesan yang dihapus tidak dapat dikembalikan."
        confirmText="Hapus Pesan"
        cancelText="Batal"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
