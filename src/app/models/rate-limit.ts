export interface RateLimit {
  id: number;
  org_id: number;
  service_account_id: number | null;
  limit_per_minute: number;
  created_at: string;
  updated_at: string | null;
  inactivated_at: string | null;
}
