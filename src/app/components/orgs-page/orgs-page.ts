import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { OrgsService } from '../../services/orgs';
import { ToastService } from '../../services/toast';
import { Org } from '../../models';
import { parseUTC } from '../../utils/date';

@Component({
  selector: 'app-orgs-page',
  imports: [NgClass],
  templateUrl: './orgs-page.html',
  styleUrl: './orgs-page.css',
})
export class OrgsPage implements OnInit {
  private readonly orgsSvc = inject(OrgsService);
  private readonly toast = inject(ToastService);

  readonly orgs = signal<Org[]>([]);
  readonly loading = signal(true);
  readonly showInactivated = signal(false);

  readonly visibleOrgs = computed(() => {
    const show = this.showInactivated();
    return this.orgs().filter(o => show || !o.inactivated_at);
  });

  readonly activeCount = computed(() => this.orgs().filter(o => !o.inactivated_at).length);
  readonly inactiveCount = computed(() => this.orgs().filter(o => !!o.inactivated_at).length);

  // Form state
  readonly formOpen = signal(false);
  readonly editingOrg = signal<Org | null>(null);
  readonly formName = signal('');
  readonly formSaving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadOrgs();
  }

  private async loadOrgs(): Promise<void> {
    try {
      this.orgs.set(await this.orgsSvc.getOrgs());
    } catch {
      this.toast.error('Failed to load organizations', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editingOrg.set(null);
    this.formName.set('');
    this.formOpen.set(true);
  }

  openEdit(org: Org): void {
    this.editingOrg.set(org);
    this.formName.set(org.name);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  async saveForm(): Promise<void> {
    const name = this.formName().trim();

    if (!name) {
      this.toast.warning('Missing fields', 'Name is required.');
      return;
    }

    this.formSaving.set(true);
    try {
      const editing = this.editingOrg();
      if (editing) {
        const updated = await this.orgsSvc.updateOrg(editing, name);
        this.orgs.update(os => os.map(o => (o.id === updated.id ? updated : o)));
        this.toast.success('Organization updated');
      } else {
        const created = await this.orgsSvc.createOrg(name);
        this.orgs.update(os => [...os, created]);
        this.toast.success('Organization created');
      }
      this.formOpen.set(false);
    } catch {
      this.toast.error('Save failed', 'Could not save the organization.');
    } finally {
      this.formSaving.set(false);
    }
  }

  async inactivate(org: Org): Promise<void> {
    try {
      const updated = await this.orgsSvc.inactivateOrg(org);
      this.orgs.update(os => os.map(o => (o.id === updated.id ? updated : o)));
      this.toast.warning('Organization inactivated', org.name);
    } catch {
      this.toast.error('Failed to inactivate organization');
    }
  }

  async reactivate(org: Org): Promise<void> {
    try {
      const updated = await this.orgsSvc.reactivateOrg(org);
      this.orgs.update(os => os.map(o => (o.id === updated.id ? updated : o)));
      this.toast.success('Organization reactivated', org.name);
    } catch {
      this.toast.error('Failed to reactivate organization');
    }
  }

  formatDate(iso: string): string {
    return parseUTC(iso).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
