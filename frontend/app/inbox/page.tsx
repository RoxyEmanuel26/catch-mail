"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchInbox, fetchInboxStats, deleteAllMessages, logoutUser, deleteMessage } from "@/lib/api";
import { getUser, isAuthenticated, formatTimeAgo, clearAuth } from "@/lib/auth";
import CopyButton from "@/components/CopyButton";
import OTPHighlight from "@/components/OTPHighlight";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "roxystore.my.id";

// Color palette for avatar backgrounds based on domain
const AVATAR_COLORS = [
  "#059669", "#0891b2", "#7c3aed", "#db2777", "#ea580c",
  "#ca8a04", "#16a34a", "#2563eb", "#9333ea", "#e11d48",
];

function getAvatarColor(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function InboxPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "otp">("all");
  const [showDropdown, setShowDropdown] = useState(false);
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

  // New message notification
  useEffect(() => {
    if (inboxQuery.data?.unread_count > prevUnread.current && prevUnread.current > 0) {
      const newCount = inboxQuery.data.unread_count - prevUnread.current;
      toast.success(`📬 ${newCount} pesan baru masuk!`, { duration: 4000 });
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

  async function handleDeleteAll() {
    if (!confirm("Hapus semua pesan? Tindakan ini tidak bisa dibatalkan.")) return;
    try {
      const res = await deleteAllMessages();
      toast.success(`🗑️ ${res.deleted_count} pesan dihapus`);
      inboxQuery.refetch();
      statsQuery.refetch();
    } catch {
      toast.error("Gagal menghapus pesan");
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

  // Filter OTP messages client-side
  const displayMessages =
    filter === "otp"
      ? messages.filter((m: any) => m.otp_detected)
      : messages;

  if (!user) return null;

  const userEmail = user.email || `${user.username}@${DOMAIN}`;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60"
        style={{ background: "rgba(9, 9, 11, 0.85)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📬</span>
            <span className="text-lg font-bold gradient-text hidden sm:block">RoxyMail</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
            <span className="text-sm text-emerald-400 font-medium">{userEmail}</span>
            <CopyButton text={userEmail} size="small" />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: "var(--accent)", color: "white" }}>
              {user.username?.[0]?.toUpperCase() || "R"}
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-44 rounded-xl overflow-hidden animate-slide-up"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: "📨", label: "Total", value: stats?.total_messages ?? "—" },
            { icon: "🔵", label: "Belum dibaca", value: stats?.unread_count ?? "—" },
            {
              icon: "🕐",
              label: "Terbaru",
              value: messages[0]?.received_at ? formatTimeAgo(messages[0].received_at) : "—",
            },
            { icon: "💾", label: "Storage", value: stats ? `${stats.storage_used_kb} KB` : "—" },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-4 text-center">
              <div className="text-lg mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-zinc-100">{stat.value}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Cari pengirim atau subjek..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-base w-full"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "unread", "otp"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filter === f
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                }`}>
                {f === "all" ? "Semua" : f === "unread" ? "Belum Dibaca" : "🔑 OTP"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {inboxQuery.isRefetching && (
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                Auto-refresh aktif
              </span>
            )}
          </div>
          {total > 0 && (
            <button onClick={handleDeleteAll} className="btn-danger text-xs">
              🗑️ Hapus Semua
            </button>
          )}
        </div>

        {/* Message List */}
        <div className="glass-card overflow-hidden">
          {inboxQuery.isLoading ? (
            // Skeleton loading
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/60">
                  <div className="w-10 h-10 rounded-full skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded skeleton" />
                    <div className="h-3 w-48 rounded skeleton" />
                  </div>
                  <div className="h-3 w-16 rounded skeleton" />
                </div>
              ))}
            </div>
          ) : displayMessages.length === 0 ? (
            // Empty state
            <div className="text-center py-16 px-6">
              <div className="text-5xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-zinc-300 mb-2">Inbox kosong</h3>
              <p className="text-zinc-600 text-sm max-w-sm mx-auto">
                Kirim email ke <span className="text-emerald-400 font-medium">{userEmail}</span> untuk mulai menerima pesan
              </p>
            </div>
          ) : (
            // Message rows
            displayMessages.map((msg: any, i: number) => (
              <div
                key={msg.id}
                onClick={() => router.push(`/message/${msg.id}`)}
                className={`message-row ${!msg.is_read ? "unread" : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}>
                {/* Avatar */}
                <div
                  className="avatar"
                  style={{
                    background: `${getAvatarColor(msg.from_address)}22`,
                    color: getAvatarColor(msg.from_address),
                  }}>
                  {(msg.from_name || msg.from_address)[0]?.toUpperCase() || "?"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-sm truncate ${!msg.is_read ? "font-semibold text-zinc-100" : "text-zinc-400"}`}>
                      {msg.from_name || msg.from_address}
                    </span>
                    {!msg.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-sm truncate ${!msg.is_read ? "font-medium text-zinc-300" : "text-zinc-500"}`}>
                    {msg.subject}
                  </p>
                </div>

                {/* Right side: OTP + time + delete */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {msg.otp_detected && (
                    <div className="otp-badge px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-default"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(msg.otp_detected);
                        toast.success("🔑 OTP disalin!");
                      }}>
                      <span className="text-xs font-bold text-white">🔑 {msg.otp_detected}</span>
                    </div>
                  )}
                  <span className="text-xs text-zinc-600 whitespace-nowrap hidden sm:block">
                    {formatTimeAgo(msg.received_at)}
                  </span>
                  <button
                    onClick={(e) => handleDeleteOne(e, msg.id)}
                    className="opacity-0 group-hover:opacity-100 hover:!opacity-100 text-zinc-600 hover:text-red-400 transition-all p-1"
                    title="Hapus">
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-sm disabled:opacity-30">
              ← Prev
            </button>
            <span className="text-sm text-zinc-500 px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost text-sm disabled:opacity-30">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
