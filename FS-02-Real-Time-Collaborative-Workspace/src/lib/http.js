import { NextResponse } from "next/server";

export function errorResponse(message, status) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function readJsonBody(request) {
  try {
    const body = await request.json();

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return {
        response: errorResponse(
          "Request body must be a JSON object",
          400
        ),
      };
    }

    return { body };
  } catch {
    return {
      response: errorResponse(
        "Invalid or missing JSON body",
        400
      ),
    };
  }
}