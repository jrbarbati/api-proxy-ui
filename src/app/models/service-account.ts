export interface ServiceAccount {
  id: number;
  org_id: number;
  identifier: string;
  client_id: string;
  client_secret?: string;
  created_at: string;
  updated_at: string | null;
  inactivated_at: string | null;
}
