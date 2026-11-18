
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {},
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(path, options);
  } catch {
    throw new ApiError(
      "Network error. Check your connection and try again.",
      0
    );
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Handle non-JSON response below.
  }

  if (!response.ok || !data || data.success !== true) {
    throw new ApiError(
      data?.message || "Something went wrong. Please try again.",
      response.status
    );
  }

  return data;
}
