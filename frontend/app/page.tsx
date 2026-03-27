"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerUser, loginUser } from "@/lib/api";
import { saveAuth, isAuthenticated } from "@/lib/auth";
import { Mail, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CopyButton from "@/components/CopyButton";
import ThemeToggle from "@/components/ThemeToggle";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "roxystore.my.id";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0); // 0=login, 1=register

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPin, setLoginPin] = useState(["", "", "", "", "", ""]);

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regPin, setRegPin] = useState(["", "", "", "", "", ""]);
  const [regConfirmPin, setRegConfirmPin] = useState(["", "", "", "", "", ""]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const regPinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const regConfirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isAuthenticated()) router.push("/inbox");
  }, [router]);

  function handlePinChange(
    index: number,
    value: string,
    pins: string[],
    setPins: (p: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newPins = [...pins];
      digits.forEach((d, i) => {
        if (i < 6) newPins[i] = d;
      });
      setPins(newPins);
      const nextIdx = Math.min(digits.length, 5);
      refs.current[nextIdx]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newPins = [...pins];
    newPins[index] = value;
    setPins(newPins);
    if (value && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePinKeyDown(
    e: React.KeyboardEvent,
    index: number,
    pins: string[],
    setPins: (p: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    if (e.key === "Backspace" && !pins[index] && index > 0) {
      const newPins = [...pins];
      newPins[index - 1] = "";
      setPins(newPins);
      refs.current[index - 1]?.focus();
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pin = loginPin.join("");
    if (pin.length !== 6) {
      setError("Masukkan 6 digit PIN");
      return;
    }
    const email = loginEmail.includes("@")
      ? loginEmail
      : `${loginEmail}@${DOMAIN}`;

    setLoading(true);
    try {
      const data = await loginUser(email, pin);
      saveAuth(data);
      toast.success("Login berhasil! 🎉");
      router.push("/inbox");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      const msg = e.response?.data?.detail || "Login gagal";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pin = regPin.join("");
    const confirmPin = regConfirmPin.join("");

    if (!regUsername || regUsername.length < 3) {
      setError("Username minimal 3 karakter");
      return;
    }
    if (pin.length !== 6) {
      setError("Masukkan 6 digit PIN");
      return;
    }
    if (pin !== confirmPin) {
      setError("PIN tidak cocok");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(regUsername.toLowerCase(), pin);
      toast.success(`✅ Email ${data.email} berhasil dibuat!`, { duration: 5000 });
      setLoginEmail(data.username);
      setActiveTab(0);
      setRegUsername("");
      setRegPin(["", "", "", "", "", ""]);
      setRegConfirmPin(["", "", "", "", "", ""]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      const msg = e.response?.data?.detail || "Registrasi gagal";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function renderPinInputs(
    pins: string[],
    setPins: (p: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) {
    return (
      <div className="flex gap-2 justify-center">
        {pins.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={digit}
            onChange={(e) => handlePinChange(i, e.target.value, pins, setPins, refs)}
            onKeyDown={(e) => handlePinKeyDown(e, i, pins, setPins, refs)}
            className="otp-box"
            autoComplete="off"
          />
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative
                     bg-gradient-to-br from-blue-50 via-white to-purple-50
                     dark:from-black dark:via-black dark:to-black">
      {/* Background glow for dark mode */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none dark:block hidden">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%)" }}
        />
      </div>

      {/* Theme Toggle — top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 mx-auto mb-4 rounded-ios-lg bg-gradient-to-br from-apple-blue
                       to-apple-indigo flex items-center justify-center shadow-glow-blue"
          >
            <Mail size={32} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">RoxyMail</h1>
          <p className="text-sm text-[var(--subtext)] mt-1">
            Email pribadi <span className="text-[var(--accent)] font-medium">@{DOMAIN}</span>
          </p>
        </div>

        {/* Card */}
        <div className="ios-card overflow-hidden p-6">
          {/* iOS Segmented Control */}
          <div className="flex bg-[var(--card2)] rounded-ios p-1 mb-6">
            {["Masuk", "Buat Email"].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(i); setError(""); }}
                className={`flex-1 py-2 text-sm font-medium rounded-[10px]
                            transition-all duration-200 relative
                            ${activeTab === i
                              ? "bg-[var(--card)] text-[var(--text)] shadow-ios-sm"
                              : "text-[var(--subtext)]"
                            }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-3 rounded-ios text-sm font-medium flex items-center gap-2
                           bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)]"
              >
                <AlertCircle size={16} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 0 ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-[var(--subtext)] mb-2">
                    Email atau Username
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--subtext)]" />
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="username"
                      className="ios-input pl-10 pr-32"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] text-sm select-none">
                      @{DOMAIN}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--subtext)] mb-3">
                    PIN (6 digit)
                  </label>
                  {renderPinInputs(loginPin, setLoginPin, loginPinRefs)}
                </div>

                <button type="submit" className="ios-btn-primary w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Memproses...</>
                  ) : (
                    "Masuk"
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-[var(--subtext)] mb-2">
                    Pilih Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="roxy_instagram"
                      className="ios-input pr-32"
                      maxLength={30}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--subtext)] text-sm select-none">
                      @{DOMAIN}
                    </span>
                  </div>
                  {regUsername && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <span className="text-xs text-[var(--subtext)]">Email kamu:</span>
                      <span className="text-sm text-[var(--accent)] font-medium font-mono">
                        {regUsername}@{DOMAIN}
                      </span>
                      <CopyButton text={`${regUsername}@${DOMAIN}`} size="small" />
                    </motion.div>
                  )}
                  <p className="text-xs text-[var(--subtext)] mt-1.5">
                    Gunakan huruf kecil, angka, dan underscore
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--subtext)] mb-3">
                    Buat PIN (6 digit)
                  </label>
                  {renderPinInputs(regPin, setRegPin, regPinRefs)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--subtext)] mb-3">
                    Konfirmasi PIN
                  </label>
                  {renderPinInputs(regConfirmPin, setRegConfirmPin, regConfirmRefs)}
                </div>

                <button type="submit" className="ios-btn-primary w-full" disabled={loading}>
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> Membuat email...</>
                  ) : (
                    "Buat Email"
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--subtext)] text-xs mt-6 opacity-60">
          RoxyMail — Disposable email pribadi oleh Roxy
        </p>
      </motion.div>
    </main>
  );
}
