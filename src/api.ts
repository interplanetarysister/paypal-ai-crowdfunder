export interface DemoUser {
  id: string;
  handle: string;
  role: "member" | "admin";
}
export interface Section {
  heading: string;
  text: string;
}
export interface Campaign {
  id: string;
  owner_id: string | null;
  title: string;
  summary: string;
  story: Section[];
  category: string;
  goal_cents: number;
  raised_cents: number;
  donor_count: number;
  status: "draft" | "published";
  organizer: string;
  location: string;
  latitude: number;
  longitude: number;
  image_path: string | null;
  ai_request_ids: string[];
  version: number;
  fictional: true;
}
export interface Status {
  mode: string;
  configured: boolean;
  payments_configured: boolean;
  ai_configured: boolean;
  media_configured: boolean;
  release_sha: string;
}
export const labels: Record<string, string> = {
  emergency: "Emergency assistance",
  medical: "Medical support",
  education: "Education",
  disaster_relief: "Disaster relief",
  community: "Community",
  animals: "Animal welfare",
  environment: "Environment",
  creative: "Creative projects",
  science: "Science & space",
};
export const DISCLOSURE =
  "DEMO CAMPAIGN — FICTIONAL CONTENT — SANDBOX PAYMENTS ONLY";
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch("/api" + path, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = (await response
    .json()
    .catch(() => ({
      error: "The demo API did not respond with valid JSON",
    }))) as { error?: string };
  if (!response.ok)
    throw new Error(data.error || "The operation was not confirmed");
  return data as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(data) });
