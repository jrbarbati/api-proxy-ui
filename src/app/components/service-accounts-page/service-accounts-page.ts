import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { ServiceAccountsService } from '../../services/service-accounts';
import { OrgsService } from '../../services/orgs';
import { ToastService } from '../../services/toast';
import { ServiceAccount, Org } from '../../models';
import { parseUTC } from '../../utils/date';

@Component({
  selector: 'app-service-accounts-page',
  imports: [NgClass],
  templateUrl: './service-accounts-page.html',
  styleUrl: './service-accounts-page.css',
})
export class ServiceAccountsPage implements OnInit {
  private readonly saSvc = inject(ServiceAccountsService);
  private readonly orgsSvc = inject(OrgsService);
  private readonly toast = inject(ToastService);

  readonly serviceAccounts = signal<ServiceAccount[]>([]);
  readonly orgs = signal<Org[]>([]);
  readonly loading = signal(true);
  readonly showInactivated = signal(false);

  // Form state
  readonly formOpen = signal(false);
  readonly formOrgId = signal<number | null>(null);
  readonly formIdentifier = signal('');
  readonly formSaving = signal(false);
  readonly revealedSecret = signal<string | null>(null);

  readonly activeCount = computed(() => this.serviceAccounts().filter(sa => !sa.inactivated_at).length);
  readonly inactiveCount = computed(() => this.serviceAccounts().filter(sa => !!sa.inactivated_at).length);

  readonly activeOrgs = computed(() => this.orgs().filter(o => !o.inactivated_at));

  readonly visibleAccounts = computed(() => {
    const show = this.showInactivated();
    const orgList = this.orgs();
    return this.serviceAccounts()
      .filter(sa => show || !sa.inactivated_at)
      .map(sa => ({
        ...sa,
        orgName: orgList.find(o => o.id === sa.org_id)?.name ?? '—',
      }));
  });

  orgName(orgId: number): string {
    return this.orgs().find(o => o.id === orgId)?.name ?? '—';
  }

  async ngOnInit(): Promise<void> {
    try {
      const [accounts, orgs] = await Promise.all([
        this.saSvc.getServiceAccounts(),
        this.orgsSvc.getOrgs(),
      ]);
      this.serviceAccounts.set(accounts);
      this.orgs.set(orgs);
    } catch {
      this.toast.error('Failed to load', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.revealedSecret.set(null);
    this.formOrgId.set(this.activeOrgs()[0]?.id ?? null);
    this.formIdentifier.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.revealedSecret.set(null);
    this.formOpen.set(false);
  }

  async saveForm(): Promise<void> {
    const orgId = this.formOrgId();
    const identifier = this.formIdentifier().trim();

    if (!orgId) {
      this.toast.warning('Missing fields', 'Please select an organization.');
      return;
    }
    if (!identifier) {
      this.toast.warning('Missing fields', 'Identifier is required.');
      return;
    }

    this.formSaving.set(true);
    try {
      const created = await this.saSvc.createServiceAccount(orgId, identifier);
      this.serviceAccounts.update(list => [...list, created]);
      this.toast.success('Service account created');
      if (created.client_secret) {
        this.revealedSecret.set(created.client_secret);
      } else {
        this.formOpen.set(false);
      }
    } catch {
      this.toast.error('Save failed', 'Could not create the service account.');
    } finally {
      this.formSaving.set(false);
    }
  }

  async inactivate(sa: ServiceAccount): Promise<void> {
    try {
      const updated = await this.saSvc.inactivateServiceAccount(sa);
      this.serviceAccounts.update(list => list.map(s => (s.id === updated.id ? updated : s)));
      this.toast.warning('Service account inactivated', sa.identifier);
    } catch {
      this.toast.error('Failed to inactivate service account');
    }
  }

  async reactivate(sa: ServiceAccount): Promise<void> {
    try {
      const updated = await this.saSvc.reactivateServiceAccount(sa);
      this.serviceAccounts.update(list => list.map(s => (s.id === updated.id ? updated : s)));
      this.toast.success('Service account reactivated', sa.identifier);
    } catch {
      this.toast.error('Failed to reactivate service account');
    }
  }

  copySecret(): void {
    const secret = this.revealedSecret();
    if (secret) {
      navigator.clipboard.writeText(secret).then(() => {
        this.toast.success('Copied', 'Client secret copied to clipboard.');
      });
    }
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
