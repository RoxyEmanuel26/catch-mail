/**
 * RoxyMail — API Client
 * Axios instance with interceptors for auth cookie handling.
 */

import axios from "axios";

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

// Response interceptor: handle 401 → refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${BACKEND_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem("access_token", access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — logout
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ── API Functions ──

export async function registerUser(username: string, pin: string) {
  const res = await api.post("/auth/register", { username, pin });
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
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  }
}

export async function fetchInbox(params: {
  page?: number;
  limit?: number;
  unread_only?: boolean;
  search?: string;
}) {
  const res = await api.get("/inbox", { params });
  return res.data;
}

export async function fetchMessage(id: string) {
  const res = await api.get(`/inbox/${id}`);
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
