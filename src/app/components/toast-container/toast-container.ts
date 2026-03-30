import { Component, inject, signal } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-toast-container',
  imports: [NgClass, NgStyle],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.css',
})
export class ToastContainer {
  readonly toastSvc = inject(ToastService);
  readonly leavingIds = signal<Set<string>>(new Set());

  dismiss(id: string): void {
    this.leavingIds.update(ids => new Set([...ids, id]));
    setTimeout(() => {
      this.toastSvc.dismiss(id);
      this.leavingIds.update(ids => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }, 280);
  }
}
