
import { apiRequest } from "@/services/apiClient";

export function login(email, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(name, email, password) {
  return apiRequest("/api/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
}

export function logout() {
  return apiRequest("/api/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser() {
  try {
    const response = await apiRequest("/api/auth/me");
    return response.user || null;
  } catch {
    return null;
  }
}
