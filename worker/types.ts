export interface DemoEnv extends Partial<
  Pick<
    GeneratedBindings,
    "DEMO_ENABLED" | "AI_ENABLED" | "DEMO_ORIGIN" | "RELEASE_SHA"
  >
> {
  ASSETS?: { fetch(request: Request): Promise<Response> };
  MEDIA?: R2Bucket;
  AI?: { run(model: string, input: Record<string, unknown>): Promise<unknown> };
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  DB_SIGNER?: string | { get(): Promise<string> };
  PAYPAL_CLIENT_ID?: string | { get(): Promise<string> };
  PAYPAL_CLIENT_SECRET?: string | { get(): Promise<string> };
  PAYPAL_WEBHOOK_ID?: string;
  PAYPAL_MERCHANT_ID?: string;
  SETUP_ENABLED?: string;
  DEMO_ENABLED?: string;
  AI_ENABLED?: string;
  DEMO_ORIGIN?: string;
  RELEASE_SHA?: string;
}
export interface User {
  id: string;
  handle: string;
  role: "member" | "admin";
}
export interface Campaign {
  id: string;
  owner_id: string | null;
  title: string;
  summary: string;
  story: { heading: string; text: string }[];
  category: string;
  goal_cents: number;
  status: "draft" | "published";
  organizer: string;
  location: string;
  latitude: number;
  longitude: number;
  image_path: string | null;
  ai_request_ids: string[];
  fictional: true;
  version: number;
  raised_cents?: number;
  donor_count?: number;
}
export interface Order {
  id: string;
  user_id: string;
  campaign_id: string | null;
  purpose: "campaign" | "platform_support";
  amount_cents: number;
  currency: "USD";
  create_key: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  merchant_id?: string | null;
  status: string;
  reconciliation: string;
  approval_url: string | null;
  created_at?: string;
  captured_at?: string;
}
export interface ProviderOrder {
  id?: string;
  status?: string;
  links?: { rel: string; href: string }[];
  purchase_units?: {
    custom_id?: string;
    amount?: { value?: string; currency_code?: string };
    payee?: { merchant_id?: string };
    payments?: {
      captures?: {
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }[];
    };
  }[];
}
