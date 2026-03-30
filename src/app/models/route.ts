export interface Route {
  id: number;
  pattern: string;
  backend_url: string;
  method: string;
  created_at: string;
  updated_at: string | null;
  inactivated_at: string | null;
}
