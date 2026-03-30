import { Injectable, signal } from '@angular/core';
import { Toast, ToastType } from '../models';

const DEFAULT_DURATION = 4500;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(title: string, message?: string, duration = DEFAULT_DURATION): void {
    this.add('success', title, message, duration);
  }

  warning(title: string, message?: string, duration = DEFAULT_DURATION): void {
    this.add('warning', title, message, duration);
  }

  info(title: string, message?: string, duration = DEFAULT_DURATION): void {
    this.add('info', title, message, duration);
  }

  error(title: string, message?: string, duration = DEFAULT_DURATION): void {
    this.add('error', title, message, duration);
  }

  dismiss(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  private add(type: ToastType, title: string, message?: string, duration = DEFAULT_DURATION): void {
    const id = crypto.randomUUID();
    this._toasts.update(toasts => [...toasts, { id, type, title, message, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }
}
