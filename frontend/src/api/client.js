import axios from "axios";
import { getStoredToken } from "../context/AuthContext";

// Base URL for the API, configurable via environment variables
const baseURL = import.meta.env.VITE_API_URL || "";

// Create an Axios instance for API requests
const api = axios.create({
  baseURL: baseURL ? `${baseURL.replace(/\/$/, "")}/api` : "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Add a request interceptor to include the authorization token
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add a response interceptor to handle authentication errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Clear stored token and redirect to login on unauthorized errors
      localStorage.removeItem("moveinsync_token");
      localStorage.removeItem("moveinsync_user");
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/signup"
      ) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  },
);

// Export API methods for authentication, locations, and trips
export const auth = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  signup: (email, password, name) =>
    api.post("/auth/signup", { email, password, name }),
  me: () => api.get("/auth/me"),
};

export const locations = {
  stream: (payload) => api.post("/locations/stream", payload),
  batch: (updates) => api.post("/locations/batch", { updates }),
};

export const trips = {
  list: (params) => api.get("/trips", { params }),
  active: () => api.get("/trips/active"),
  get: (tripId) => api.get(`/trips/${tripId}`),
  create: (data) => api.post("/trips", data),
  updateStatus: (tripId, status, reason) =>
    api.patch(`/trips/${tripId}/status`, { status, reason }),
  events: (tripId) => api.get(`/trips/${tripId}/events`),
};

export const offices = {
  list: (params) => api.get("/offices", { params }),
  get: (id) => api.get(`/offices/${id}`),
  create: (data) => api.post("/offices", data),
  update: (id, data) => api.put(`/offices/${id}`, data),
};

export const vehicles = {
  list: (params) => api.get("/vehicles", { params }),
  get: (vehicleId) => api.get(`/vehicles/${vehicleId}`),
  create: (data) => api.post("/vehicles", data),
};

export const geofenceEvents = {
  list: (params) => api.get("/geofence-events", { params }),
};

export const simulator = {
  start: (tripId) => api.post("/simulator/start", { tripId }),
  stop: (tripId) => api.post("/simulator/stop", { tripId }),
  startFleet: () => api.post("/simulator/start-fleet"),
  stopFleet: () => api.post("/simulator/stop-fleet"),
  status: () => api.get("/simulator/status"),
};

export const demo = {
  seed: () => api.post("/demo/seed"),
};

export default api;
