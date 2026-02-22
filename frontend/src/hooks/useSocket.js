import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getStoredToken } from "../context/AuthContext";

// Helper function to determine the WebSocket URL
function getSocketUrl() {
  const url =
    import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || "";
  if (url) return url.replace(/\/$/, "");
  return window.location.origin;
}

// Custom hook to manage WebSocket connection
export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const baseUrl = getSocketUrl();
    const token = getStoredToken();

    // Initialize the WebSocket connection
    const s = io(baseUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    setSocket(s);

    // Handle connection events
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("connect_error", () => setConnected(false));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, []);

  return { socket, connected };
}

// Custom hook to listen for location updates
export function useLocationUpdates(socket, onUpdate) {
  useEffect(() => {
    if (!socket || !onUpdate) return;
    socket.on("location:update", onUpdate);
    return () => socket.off("location:update", onUpdate);
  }, [socket, onUpdate]);
}

// Custom hook to listen for geofence events
export function useGeofenceEvents(socket, onEvent) {
  useEffect(() => {
    if (!socket || !onEvent) return;
    socket.on("geofence:event", onEvent);
    return () => socket.off("geofence:event", onEvent);
  }, [socket, onEvent]);
}

// Custom hook to listen for trip updates
export function useTripUpdates(socket, onUpdate) {
  useEffect(() => {
    if (!socket || !onUpdate) return;
    socket.on("trip:updated", onUpdate);
    return () => socket.off("trip:updated", onUpdate);
  }, [socket, onUpdate]);
}

/** NEW: live stats updates from server — stats:update event */
export function useStatsUpdates(socket, onStats) {
  useEffect(() => {
    if (!socket || !onStats) return;
    socket.on("stats:update", onStats);
    return () => socket.off("stats:update", onStats);
  }, [socket, onStats]);
}
