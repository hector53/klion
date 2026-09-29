import { getSession } from "next-auth/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

/**
 * Derives the backend origin from the API URL.
 * e.g. "http://localhost:3001/api" -> "http://localhost:3001"
 */
function getBackendOrigin(): string {
  try {
    const url = new URL(API_URL);
    return url.origin;
  } catch {
    // Fallback: strip trailing /api
    return API_URL.replace(/\/api\/?$/, "");
  }
}

export const uploadImageToFilesService = async (file: File): Promise<string> => {
  const endpoint = `${API_URL}/files/upload`;

  const formData = new FormData();
  formData.append("file", file);

  // Get auth token
  const session = await getSession();
  const token =
    (session?.user as any)?.accessToken || (session as any)?.accessToken;

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Upload failed";
    try {
      const data = await response.json();
      errorMsg = data?.message || data?.error || errorMsg;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();

  if (!data?.url) {
    throw new Error("Upload response missing file URL");
  }

  // The backend returns "/api/files/serve/filename.png"
  // Prepend the backend origin for the full URL
  const origin = getBackendOrigin();
  return `${origin}${data.url}`;
};
