export interface Request {
  id: number;
  method: string;
  url: string;
  status_code: number;
  latency: number;
  created_at: string;
  route_id: number | null;
}
