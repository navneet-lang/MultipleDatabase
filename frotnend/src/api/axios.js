import axios from "axios";

// Backend httpOnly cookies (access_token/refresh_token) use karta hai,
// isliye withCredentials: true zaroori hai har request ke liye.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Access token expire ho jaye (401) to ek baar refresh try karo, phir retry.
// Agar refresh call khud hi 401 de, to usse dubara retry mat karo
// (warna infinite loop ban jaata hai).
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isRefreshCall = original.url?.includes("/auth/refresh/");

    if (error.response?.status === 401 && !original._retry && !isRefreshCall) {
      original._retry = true;
      try {
        await api.post("/auth/refresh/");
        return api(original);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;  