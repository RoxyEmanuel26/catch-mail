import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "RoxyMail — Email Pribadi @roxystore.my.id",
  description:
    "Layanan email disposable pribadi dengan domain roxystore.my.id. Terima email, deteksi OTP otomatis, gratis selamanya.",
  keywords: ["disposable email", "temp mail", "roxystore.my.id", "OTP detector"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#09090b" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📬</text></svg>" />
      </head>
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1c1c21",
                color: "#fafafa",
                border: "1px solid #27272a",
                borderRadius: "12px",
                fontSize: "0.9rem",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fafafa",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "#fafafa",
                },
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
