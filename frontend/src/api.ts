
import type { AlertRule, Geofence, Vehicle, Violation } from "./types";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://geofencing-real-time-alert-system-7frd.onrender.com";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  API_URL.replace(/^https:/, "wss:").replace(/^http:/, "ws:") +
    "/ws/alerts";

export const API_BASE_URL = API_URL.replace(/\/+$/, "");

export const WS_BASE_URL = WS_URL;



// Generic API request
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}

// POST helper
const post = (path: string, body: unknown) =>
  request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

// API methods
export const api = {
  health: () => request<{ status: string }>("/health"),

  geofences: (category = "") =>
    request<{ geofences: Geofence[] }>(
      `/geofences${
        category ? `?category=${encodeURIComponent(category)}` : ""
      }`,
    ),

  createGeofence: (body: Omit<Geofence, "id">) =>
    post("/geofences", body),

  vehicles: () =>
    request<{ vehicles: Vehicle[] }>("/vehicles"),

  createVehicle: (body: Omit<Vehicle, "id" | "status">) =>
    post("/vehicles", body),

  updateLocation: (body: {
    vehicle_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
  }) => post("/vehicles/location", body),

  configureAlert: (body: {
    geofence_id: string;
    vehicle_id?: string;
    event_type: string;
  }) => post("/alerts/configure", body),

  alerts: () =>
    request<{ alerts: AlertRule[] }>("/alerts"),

  history: (
    filters: {
      vehicle_id?: string;
      geofence_id?: string;
      limit?: number;
    } = {},
  ) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    });

    return request<{
      violations: Violation[];
      total_count: number;
    }>(`/violations/history?${params.toString()}`);
  },
};
