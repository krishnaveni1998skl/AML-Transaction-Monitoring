import axios from "axios";

// Resolves the production or local development API base URL
// Production API base URL: https://aml-transaction-monitoring.onrender.com/api
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    return "/api";
  }
  const trimmed = envUrl.trim().replace(/\/+$/, "");
  if (!trimmed.endsWith("/api") && !trimmed.includes("/api/")) {
    return `${trimmed}/api`;
  }
  return trimmed;
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Route versioned endpoints to /v1 while preserving /health
api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    const cleanUrl = config.url.startsWith("/") ? config.url : `/${config.url}`;

    // Health check endpoint resolves directly to ${baseURL}/health
    if (cleanUrl === "/health" || cleanUrl.startsWith("/health?")) {
      config.url = cleanUrl;
    } else if (!cleanUrl.startsWith("/v1/") && cleanUrl !== "/v1") {
      // Backend domain routes are mounted under /api/v1/*
      config.url = `/v1${cleanUrl}`;
    }
  }

  // Attach JWT token from localStorage
  const token = localStorage.getItem("aml_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle 401 unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!error.config?.url?.includes("/auth/login")) {
        localStorage.removeItem("aml_auth_token");
        localStorage.removeItem("aml_user_info");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
