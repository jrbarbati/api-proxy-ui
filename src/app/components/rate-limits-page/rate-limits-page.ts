import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { RateLimitsService, RateLimitPayload } from '../../services/rate-limit';
import { OrgsService } from '../../services/orgs';
import { ServiceAccountsService } from '../../services/service-accounts';
import { ToastService } from '../../services/toast';
import { RateLimit, Org, ServiceAccount } from '../../models';
import { parseUTC } from '../../utils/date';

interface OrgGroup {
  org: Org;
  orgLimit: RateLimit | null;
  saEntries: { limit: RateLimit; sa: ServiceAccount }[];
}

@Component({
  selector: 'app-rate-limits-page',
  imports: [NgClass],
  templateUrl: './rate-limits-page.html',
  styleUrl: './rate-limits-page.css',
})
export class RateLimitsPage implements OnInit {
  private readonly limitsSvc = inject(RateLimitsService);
  private readonly orgsSvc = inject(OrgsService);
  private readonly sasSvc = inject(ServiceAccountsService);
  private readonly toast = inject(ToastService);

  readonly limits = signal<RateLimit[]>([]);
  readonly orgs = signal<Org[]>([]);
  readonly serviceAccounts = signal<ServiceAccount[]>([]);
  readonly loading = signal(true);
  readonly showInactivated = signal(false);

  // Form
  readonly formOpen = signal(false);
  readonly editingLimit = signal<RateLimit | null>(null);
  readonly formScope = signal<'org' | 'sa'>('org');
  readonly formOrgId = signal<number | null>(null);
  readonly formSaId = signal<number | null>(null);
  readonly formLimitPerMinute = signal('');
  readonly formSaving = signal(false);

  readonly activeCount = computed(() => this.limits().filter(l => !l.inactivated_at).length);
  readonly inactiveCount = computed(() => this.limits().filter(l => !!l.inactivated_at).length);

  readonly activeOrgs = computed(() => this.orgs().filter(o => !o.inactivated_at));

  readonly formSaOptions = computed(() => {
    const orgId = this.formOrgId();
    if (!orgId) return [];
    return this.serviceAccounts().filter(sa => sa.org_id === orgId && !sa.inactivated_at);
  });

  readonly formEditContext = computed(() => {
    const editing = this.editingLimit();
    if (!editing) return null;
    const org = this.orgs().find(o => o.id === editing.org_id);
    if (!editing.service_account_id) return { scope: 'org' as const, label: org?.name ?? `Org #${editing.org_id}` };
    const sa = this.serviceAccounts().find(s => s.id === editing.service_account_id);
    return {
      scope: 'sa' as const,
      label: sa?.identifier ?? `SA #${editing.service_account_id}`,
      orgLabel: org?.name ?? `Org #${editing.org_id}`,
    };
  });

  readonly orgGroups = computed((): OrgGroup[] => {
    const orgs = this.activeOrgs();
    const limits = this.limits();
    const accounts = this.serviceAccounts();
    const show = this.showInactivated();

    return orgs
      .map(org => {
        const allOrgLimits = limits.filter(
          l => l.org_id === org.id && l.service_account_id === null,
        );
        const allSaLimits = limits.filter(
          l => l.org_id === org.id && l.service_account_id !== null,
        );

        const activeOrgLimit = allOrgLimits.find(l => !l.inactivated_at) ?? null;
        const orgLimit =
          activeOrgLimit ?? (show && allOrgLimits.length ? allOrgLimits[0] : null);

        const saEntries = allSaLimits
          .filter(l => show || !l.inactivated_at)
          .map(limit => ({
            limit,
            sa: accounts.find(a => a.id === limit.service_account_id) ?? null,
          }))
          .filter((e): e is { limit: RateLimit; sa: ServiceAccount } => e.sa !== null);

        return { org, orgLimit, saEntries };
      })
      .filter(g => g.orgLimit !== null || g.saEntries.length > 0);
  });

  async ngOnInit(): Promise<void> {
    try {
      const [limits, orgs, serviceAccounts] = await Promise.all([
        this.limitsSvc.getRateLimits(),
        this.orgsSvc.getOrgs(),
        this.sasSvc.getServiceAccounts(),
      ]);
      this.limits.set(limits);
      this.orgs.set(orgs);
      this.serviceAccounts.set(serviceAccounts);
    } catch {
      this.toast.error('Failed to load rate limits', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(prefilledOrg?: Org): void {
    this.editingLimit.set(null);
    this.formScope.set('org');
    this.formOrgId.set(prefilledOrg?.id ?? null);
    this.formSaId.set(null);
    this.formLimitPerMinute.set('');
    this.formOpen.set(true);
  }

  openEdit(limit: RateLimit): void {
    this.editingLimit.set(limit);
    this.formScope.set(limit.service_account_id ? 'sa' : 'org');
    this.formOrgId.set(limit.org_id);
    this.formSaId.set(limit.service_account_id);
    this.formLimitPerMinute.set(String(limit.limit_per_minute));
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  async saveForm(): Promise<void> {
    const limitVal = parseInt(this.formLimitPerMinute(), 10);
    if (!limitVal || limitVal < 1) {
      this.toast.warning('Invalid limit', 'Enter a positive integer.');
      return;
    }

    const editing = this.editingLimit();
    this.formSaving.set(true);

    try {
      if (editing) {
        const updated = await this.limitsSvc.updateRateLimit(editing, limitVal);
        this.limits.update(ls => ls.map(l => (l.id === updated.id ? updated : l)));
        this.toast.success('Rate limit updated');
      } else {
        const orgId = this.formOrgId();
        if (!orgId) { this.toast.warning('Select an organization.'); return; }

        const saId = this.formScope() === 'sa' ? this.formSaId() : null;
        if (this.formScope() === 'sa' && !saId) {
          this.toast.warning('Select a service account.');
          return;
        }

        const payload: RateLimitPayload = { org_id: orgId, service_account_id: saId, limit_per_minute: limitVal };
        const created = await this.limitsSvc.createRateLimit(payload);
        this.limits.update(ls => [...ls, created]);
        this.toast.success('Rate limit created');
      }
      this.formOpen.set(false);
    } catch {
      this.toast.error('Save failed', 'Could not save the rate limit.');
    } finally {
      this.formSaving.set(false);
    }
  }

  async inactivate(limit: RateLimit): Promise<void> {
    try {
      const updated = await this.limitsSvc.inactivateRateLimit(limit);
      this.limits.update(ls => ls.map(l => (l.id === updated.id ? updated : l)));
      this.toast.warning('Rate limit inactivated');
    } catch {
      this.toast.error('Failed to inactivate');
    }
  }

  async reactivate(limit: RateLimit): Promise<void> {
    try {
      const updated = await this.limitsSvc.reactivateRateLimit(limit);
      this.limits.update(ls => ls.map(l => (l.id === updated.id ? updated : l)));
      this.toast.success('Rate limit reactivated');
    } catch {
      this.toast.error('Failed to reactivate');
    }
  }

  formatDate(iso: string): string {
    return parseUTC(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
