export interface InternalUser {
  id: number;
  email: string;
  password?: string;
  created_at: string;
  updated_at: string | null;
  inactivated_at: string | null;
}
