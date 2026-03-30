import { Component, signal, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-login',
  imports: [NgClass, ThemeToggle],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  emailFocused = signal(false);
  passwordFocused = signal(false);
  loading = signal(false);
  error = signal('');
  shaking = signal(false);

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;

    const email = this.email().trim();
    const password = this.password();

    if (!email || !password) {
      this.triggerShake('Please enter your email and password.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.auth.login(email, password);
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.loading.set(false);
      const title = err.status === 401 ? 'Authentication failed' : 'Something went wrong';
      const message =
        err.status === 401
          ? 'Invalid email or password.'
          : `Server returned ${err.status ?? 'an error'}. Please try again.`;
      this.toast.error(title, message);
      this.triggerShake(message);
    }
  }

  private triggerShake(message: string): void {
    this.error.set(message);
    this.shaking.set(true);
    setTimeout(() => this.shaking.set(false), 600);
  }
}
