import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth';

const WARN_SECONDS = 120;
const ARC_R = 54;
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R; // ≈ 339.29

@Component({
  selector: 'app-session-warning',
  imports: [],
  templateUrl: './session-warning.html',
  styleUrl: './session-warning.css',
})
export class SessionWarning implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);

  readonly countdown = signal(WARN_SECONDS);
  readonly extending = signal(false);

  readonly minutes = computed(() => Math.floor(this.countdown() / 60));
  readonly seconds = computed(() => this.countdown() % 60);
  readonly secondsStr = computed(() => String(this.seconds()).padStart(2, '0'));

  // Arc drains from full to empty over WARN_SECONDS
  readonly arcOffset = computed(() => (1 - this.countdown() / WARN_SECONDS) * ARC_CIRCUMFERENCE);
  readonly circumference = ARC_CIRCUMFERENCE;

  readonly isUrgent = computed(() => this.countdown() <= 30);

  private interval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.interval = setInterval(() => {
      this.countdown.update(n => {
        if (n <= 1) {
          this.clearInterval();
          this.auth.logout();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }

  ngOnDestroy(): void {
    this.clearInterval();
  }

  async extend(): Promise<void> {
    if (this.extending()) return;
    this.extending.set(true);
    await this.auth.extendSession();
    // Component is destroyed by @if when showWarning becomes false
  }

  signOut(): void {
    this.auth.logout();
  }

  private clearInterval(): void {
    if (this.interval !== null) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
