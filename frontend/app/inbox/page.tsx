"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchInbox,
  fetchInboxStats,
  logoutUser,
  deleteMessage,
  markAllAsRead,
} from "@/lib/api";
import { getUser, isAuthenticated, formatTimeAgo, clearAuth } from "@/lib/auth";
import { getColorFromEmail } from "@/lib/utils";
import CopyButton from "@/components/CopyButton";
import ThemeToggle from "@/components/ThemeToggle";
import { Mail, LogOut, Search, Copy, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "roxystore.my.id";

interface Message {
  id: string;
  from_name?: string;
  from_address: string;
  subject: string;
  otp_detected?: string;
  is_read: boolean;
  received_at: string;
}

interface UserData {
  email?: string;
  username?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function InboxPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "otp">("all");
  const prevUnread = useRef(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }
    const u = getUser();
    setUser(u);
  }, [router]);

  const inboxQuery = useQuery({
    queryKey: ["inbox", page, search, filter],
    queryFn: () =>
      fetchInbox({
        page,
        limit: 20,
        unread_only: filter === "unread",
        search,
      }),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    enabled: !!user,
  });

  const statsQuery = useQuery({
    queryKey: ["inbox-stats"],
    queryFn: fetchInboxStats,
    refetchInterval: 10000,
    enabled: !!user,
  });

  useEffect(() => {
    if (
      inboxQuery.data?.unread_count > prevUnread.current &&
      prevUnread.current > 0
    ) {
      const newCount = inboxQuery.data.unread_count - prevUnread.current;
      toast.success(`📬 ${newCount} pesan baru masuk!`);
    }
    prevUnread.current = inboxQuery.data?.unread_count ?? 0;
  }, [inboxQuery.data?.unread_count]);

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {}
    clearAuth();
    router.push("/");
  }

  async function handleMarkAllRead() {
    try {
      const res = await markAllAsRead();
      toast.success(`✅ ${res.marked_count} pesan ditandai sudah dibaca`);
      inboxQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error("Gagal menandai pesan");
    }
  }

  async function handleDeleteOne(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await deleteMessage(id);
      toast.success("Pesan dihapus");
      inboxQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error("Gagal menghapus pesan");
    }
  }

  const messages = inboxQuery.data?.messages || [];
  const total = inboxQuery.data?.total || 0;
  const totalPages = Math.ceil(total / 20);
  const stats = statsQuery.data;

  const displayMessages =
    filter === "otp"
      ? messages.filter((m: Message) => m.otp_detected)
      : messages;

  if (!user) return null;

  const userEmail = user.email || `${user.username}@${DOMAIN}`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-ios bg-gradient-to-br from-apple-blue
                          to-apple-indigo flex items-center justify-center"
            >
              <Mail size={16} className="text-white" />
            </div>
            <span className="font-semibold text-[15px] hidden sm:block">
              RoxyMail
            </span>
          </div>

          {/* Center: Email pill */}
          <div
            className="flex items-center gap-1.5 bg-[var(--card2)] rounded-full
                        px-3 py-1.5 border border-[var(--border)]"
          >
            <span className="text-xs font-mono text-[var(--text)] truncate max-w-[160px]">
              {userEmail}
            </span>
            <CopyButton text={userEmail} size="small" />
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2.5 rounded-ios bg-[var(--card2)] border border-[var(--border)]
                         text-[var(--subtext)] hover:text-[var(--red)] transition-colors"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </motion.button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {[
            {
              icon: "📨",
              label: "Total Pesan",
              value: stats?.total_messages ?? "—",
            },
            {
              icon: "🔵",
              label: "Belum Dibaca",
              value: stats?.unread_count ?? "—",
              accent: (stats?.unread_count ?? 0) > 0,
            },
            {
              icon: "🕐",
              label: "Terakhir",
              value: messages[0]?.received_at
                ? formatTimeAgo(messages[0].received_at)
                : "—",
            },
            {
              icon: "💾",
              label: "Storage",
              value: stats ? `${stats.storage_used_kb} KB` : "—",
            },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={item}
              className="ios-card p-4 text-center"
            >
              <div className="text-lg mb-1">{stat.icon}</div>
              <div
                className={`text-lg font-bold ${
                  "accent" in stat && stat.accent
                    ? "text-[var(--accent)]"
                    : "text-[var(--text)]"
                }`}
              >
                {stat.value}
              </div>
              <div className="text-xs text-[var(--subtext)] mt-0.5">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtext)]"
            />
            <input
              type="text"
              placeholder="Cari pengirim atau subjek..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="ios-input pl-9 !rounded-full"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "unread", "otp"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-[var(--accent)] text-white shadow-ios-sm"
                    : "bg-[var(--card2)] text-[var(--subtext)] border border-[var(--border)] hover:text-[var(--text)]"
                }`}
              >
                {f === "all"
                  ? "Semua"
                  : f === "unread"
                  ? "Belum Dibaca"
                  : "🔑 OTP"}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {inboxQuery.isRefetching && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--subtext)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse-soft" />
                Live
              </span>
            )}
          </div>
          {total > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-ios text-xs font-medium
                         text-[var(--accent)] border border-[var(--accent)]/30
                         hover:bg-[var(--accent)]/10 transition-all
                         flex items-center gap-1.5"
            >
              <CheckCheck size={14} />
              Baca Semua
            </motion.button>
          )}
        </div>

        {/* Message List */}
        <div className="space-y-2">
          {inboxQuery.isLoading ? (
            // Skeleton
            [...Array(5)].map((_, i) => (
              <div key={i} className="ios-card p-4 flex items-start gap-3">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-48 rounded" />
                </div>
              </div>
            ))
          ) : displayMessages.length === 0 ? (
            // Empty state
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-semibold mb-2 text-[var(--text)]">
                Inbox Kosong
              </h3>
              <p className="text-[var(--subtext)] text-sm max-w-xs mx-auto">
                Kirim email ke{" "}
                <span className="font-mono text-[var(--accent)]">
                  {userEmail}
                </span>{" "}
                untuk mulai menerima pesan
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayMessages.map((msg: Message) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={() => router.push(`/message/${msg.id}`)}
                  className={`ios-card p-4 cursor-pointer active:scale-[0.98]
                             hover:shadow-ios-lg transition-all duration-200
                             ${!msg.is_read ? "border-l-4 border-l-[var(--accent)]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center
                                  text-white font-semibold text-sm flex-shrink-0"
                      style={{
                        background: getColorFromEmail(msg.from_address),
                      }}
                    >
                      {msg.from_name?.[0]?.toUpperCase() ??
                        msg.from_address[0]?.toUpperCase()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`text-[14px] truncate ${
                            !msg.is_read ? "font-semibold" : "font-medium"
                          } text-[var(--text)]`}
                        >
                          {msg.from_name || msg.from_address}
                        </span>
                        <span className="text-xs text-[var(--subtext)] ml-2 flex-shrink-0">
                          {formatTimeAgo(msg.received_at)}
                        </span>
                      </div>
                      <p className="text-[13px] text-[var(--subtext)] truncate">
                        {msg.subject}
                      </p>

                      {/* OTP Badge */}
                      {msg.otp_detected && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="mt-2 inline-flex items-center gap-2 bg-[var(--green)]/15
                                     border border-[var(--green)]/30 rounded-ios px-3 py-1.5"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                          <span className="text-[var(--green)] font-mono font-bold text-sm tracking-widest">
                            {msg.otp_detected}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(
                                msg.otp_detected || ""
                              );
                              toast.success("Kode OTP disalin!");
                            }}
                            className="text-[var(--green)] hover:opacity-70"
                          >
                            <Copy size={13} />
                          </button>
                        </motion.div>
                      )}
                    </div>

                    {/* Unread dot */}
                    {!msg.is_read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1" />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="ios-btn-secondary text-sm !py-2 !px-4 disabled:opacity-30"
            >
              ←
            </button>
            <span className="text-sm text-[var(--subtext)] px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="ios-btn-secondary text-sm !py-2 !px-4 disabled:opacity-30"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
