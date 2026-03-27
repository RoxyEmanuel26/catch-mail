"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const cycle = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  const icons = { light: Sun, dark: Moon, system: Monitor };
  const Icon = icons[theme as keyof typeof icons] ?? Monitor;

  return (
    <motion.button
      onClick={cycle}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className="p-2.5 rounded-ios bg-[var(--card2)] border border-[var(--border)]
                 text-[var(--subtext)] hover:text-[var(--text)] transition-colors"
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          initial={{ rotate: -30, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          exit={{ rotate: 30, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Icon size={18} />
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
