export interface AuditEntry {
  id: number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: Record<string, unknown> | null;
  created_at: string;
}
