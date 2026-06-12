/**
 * RoxyMail — API Client
 * Axios instance with interceptors for auth cookie handling.
 */

import axios from "axios";
import { clearAuth } from "./auth";

const BACKEND_URL =
  typeof window !== "undefined" && process.env.NEXT_PUBLIC_BACKEND_URL
    ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`
    : "/api/backend";

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Mutex / Queue variables to prevent token refresh race conditions (H11)
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor: handle 401 → refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const response = await axios.post(`${BACKEND_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Backend rotates both tokens under RTR
        const { access_token, refresh_token } = response.data;
        localStorage.setItem("access_token", access_token);
        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
        }

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        processQueue(null, access_token);
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        // Centralized logout logic (L8)
        clearAuth();
        if (typeof window !== "undefined") {
          window.location.href = "/";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── API Functions ──

export async function registerUser(username: string, pin: string, domain: string) {
  const res = await api.post("/auth/register", { username, pin, domain });
  return res.data;
}

export async function loginUser(email: string, pin: string) {
  const res = await api.post("/auth/login", { email, pin });
  return res.data;
}

export async function logoutUser() {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAuth();
  }
}

export async function fetchInbox(params: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  search?: string;
  otp_only?: boolean;
  folder?: string;
}) {
  const res = await api.get("/inbox", { params });
  return res.data;
}

export async function fetchMessage(id: string) {
  const res = await api.get(`/inbox/${id}`);
  return res.data;
}

export async function moveMessageToFolder(id: string, folder: string) {
  const res = await api.put(`/inbox/${id}/folder`, null, { params: { folder } });
  return res.data;
}

export async function deleteMessage(id: string) {
  const res = await api.delete(`/inbox/${id}`);
  return res.data;
}

export async function deleteAllMessages() {
  const res = await api.delete("/inbox");
  return res.data;
}

export async function markAllAsRead() {
  const res = await api.put("/inbox/read-all");
  return res.data;
}

export async function fetchInboxStats() {
  const res = await api.get("/inbox/stats");
  return res.data;
}

export default api;
