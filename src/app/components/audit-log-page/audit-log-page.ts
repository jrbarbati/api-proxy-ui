import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { AuditLogService } from '../../services/audit-log';
import { ToastService } from '../../services/toast';
import { AuditEntry } from '../../models/audit-log';
import { parseUTC } from '../../utils/date';

@Component({
  selector: 'app-audit-log-page',
  imports: [NgClass],
  templateUrl: './audit-log-page.html',
  styleUrl: './audit-log-page.css',
})
export class AuditLogPage implements OnInit {
  private readonly auditLogSvc = inject(AuditLogService);
  private readonly toast = inject(ToastService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly loading = signal(true);
  readonly filterEntityType = signal<string>('all');
  readonly filterAction = signal<string>('all');

  readonly entityTypes = computed(() => ['all', ...new Set(this.entries().map(e => e.entity_type))]);
  readonly actions = computed(() => ['all', ...new Set(this.entries().map(e => e.action))]);

  readonly filteredEntries = computed(() =>
    this.entries().filter(
      e =>
        (this.filterEntityType() === 'all' || e.entity_type === this.filterEntityType()) &&
        (this.filterAction() === 'all' || e.action === this.filterAction()),
    ),
  );

  async ngOnInit(): Promise<void> {
    try {
      this.entries.set(await this.auditLogSvc.getEntries());
    } catch {
      this.toast.error('Failed to load audit log', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  changesCount(entry: AuditEntry): number {
    return entry.changes ? Object.keys(entry.changes).length : 0;
  }

  formatDate(iso: string): string {
    return parseUTC(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
