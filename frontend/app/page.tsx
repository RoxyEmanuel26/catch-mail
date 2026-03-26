"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { registerUser, loginUser } from "@/lib/api";
import { saveAuth, isAuthenticated } from "@/lib/auth";
import CopyButton from "@/components/CopyButton";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "roxystore.my.id";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

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
    // Handle paste
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

    if (value && index < 5) {
      refs.current[index + 1]?.focus();
    }
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
      toast.success(`✅ Email ${data.email} berhasil dibuat!`, {
        duration: 5000,
      });
      // Switch to login tab with email pre-filled
      setLoginEmail(data.username);
      setActiveTab("login");
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
            className="pin-input"
            autoComplete="off"
          />
        ))}
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at top, #0a1f1a 0%, #09090b 50%)",
      }}>
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📬</div>
          <h1 className="text-3xl font-bold gradient-text">RoxyMail</h1>
          <p className="text-zinc-500 mt-2 text-sm">
            Email pribadi dengan domain <span className="text-emerald-400 font-medium">@{DOMAIN}</span>
          </p>
        </div>

        {/* Card */}
        <div className="glass-card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => { setActiveTab("login"); setError(""); }}
              className={`tab-button ${activeTab === "login" ? "active" : ""}`}>
              Masuk
            </button>
            <button
              onClick={() => { setActiveTab("register"); setError(""); }}
              className={`tab-button ${activeTab === "register" ? "active" : ""}`}>
              Buat Email Baru
            </button>
          </div>

          <div className="p-6">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-xl text-sm font-medium animate-slide-up"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                }}>
                ⚠️ {error}
              </div>
            )}

            {activeTab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Email atau Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="username"
                      className="input-base pr-28"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm select-none">
                      @{DOMAIN}
                    </span>
                  </div>
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    PIN (6 digit)
                  </label>
                  {renderPinInputs(loginPin, setLoginPin, loginPinRefs)}
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    "Masuk →"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Pilih Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="roxy_instagram"
                      className="input-base pr-28"
                      maxLength={30}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-sm select-none">
                      @{DOMAIN}
                    </span>
                  </div>
                  {regUsername && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-zinc-500">Email kamu:</span>
                      <span className="text-sm text-emerald-400 font-medium">
                        {regUsername}@{DOMAIN}
                      </span>
                      <CopyButton text={`${regUsername}@${DOMAIN}`} size="small" />
                    </div>
                  )}
                  <p className="text-xs text-zinc-600 mt-1.5">
                    Gunakan huruf kecil, angka, dan underscore
                  </p>
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Buat PIN (6 digit)
                  </label>
                  {renderPinInputs(regPin, setRegPin, regPinRefs)}
                </div>

                {/* Confirm PIN */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">
                    Konfirmasi PIN
                  </label>
                  {renderPinInputs(regConfirmPin, setRegConfirmPin, regConfirmRefs)}
                </div>

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Membuat email...
                    </span>
                  ) : (
                    "Buat Email →"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-700 text-xs mt-6">
          RoxyMail — Disposable email pribadi oleh Roxy
        </p>
      </div>
    </main>
  );
}
