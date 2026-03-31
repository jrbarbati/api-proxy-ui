import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { UsersService } from '../../services/users';
import { ToastService } from '../../services/toast';
import { InternalUser } from '../../models';
import { parseUTC } from '../../utils/date';

@Component({
  selector: 'app-users-page',
  imports: [NgClass],
  templateUrl: './users-page.html',
  styleUrl: './users-page.css',
})
export class UsersPage implements OnInit {
  private readonly usersSvc = inject(UsersService);
  private readonly toast = inject(ToastService);

  readonly users = signal<InternalUser[]>([]);
  readonly loading = signal(true);
  readonly showInactivated = signal(false);

  readonly activeCount = computed(() => this.users().filter(u => !u.inactivated_at).length);
  readonly inactiveCount = computed(() => this.users().filter(u => !!u.inactivated_at).length);

  readonly visibleUsers = computed(() => {
    const show = this.showInactivated();
    return this.users().filter(u => show || !u.inactivated_at);
  });

  // Form state
  readonly formOpen = signal(false);
  readonly formEmail = signal('');
  readonly formPassword = signal('');
  readonly formSaving = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadUsers();
  }

  private async loadUsers(): Promise<void> {
    try {
      this.users.set(await this.usersSvc.getUsers());
    } catch {
      this.toast.error('Failed to load users', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.formEmail.set('');
    this.formPassword.set('');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  async saveForm(): Promise<void> {
    const email = this.formEmail().trim();
    const password = this.formPassword();

    if (!email || !password) {
      this.toast.warning('Missing fields', 'Email and password are required.');
      return;
    }

    this.formSaving.set(true);
    try {
      const created = await this.usersSvc.createUser({ email, password });
      this.users.update(us => [...us, created]);
      this.toast.success('User created');
      this.formOpen.set(false);
    } catch {
      this.toast.error('Save failed', 'Could not create the user.');
    } finally {
      this.formSaving.set(false);
    }
  }

  async inactivate(user: InternalUser): Promise<void> {
    try {
      const updated = await this.usersSvc.inactivateUser(user);
      this.users.update(us => us.map(u => (u.id === updated.id ? updated : u)));
      this.toast.warning('User inactivated', user.email);
    } catch {
      this.toast.error('Failed to inactivate user');
    }
  }

  async reactivate(user: InternalUser): Promise<void> {
    try {
      const updated = await this.usersSvc.reactivateUser(user);
      this.users.update(us => us.map(u => (u.id === updated.id ? updated : u)));
      this.toast.success('User reactivated', user.email);
    } catch {
      this.toast.error('Failed to reactivate user');
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
