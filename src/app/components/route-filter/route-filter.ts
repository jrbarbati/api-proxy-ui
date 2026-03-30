import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgClass } from '@angular/common';
import { Route } from '../../models';

@Component({
  selector: 'app-route-filter',
  imports: [NgClass],
  templateUrl: './route-filter.html',
  styleUrl: './route-filter.css',
})
export class RouteFilter {
  private readonly el = inject(ElementRef);

  routes = input<Route[]>([]);
  selectionChange = output<Route[]>();

  readonly open = signal(false);
  readonly searchQuery = signal('');
  readonly selectedIds = signal<Set<number>>(new Set());

  readonly filteredRoutes = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.routes();
    return this.routes().filter(
      r =>
        r.pattern.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.backend_url.toLowerCase().includes(q),
    );
  });

  readonly selectionLabel = computed(() => {
    const size = this.selectedIds().size;
    if (size === 0) return 'All routes';
    return `${size} route${size !== 1 ? 's' : ''} selected`;
  });

  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggle(route: Route): void {
    this.selectedIds.update(ids => {
      const next = new Set(ids);
      next.has(route.id) ? next.delete(route.id) : next.add(route.id);
      return next;
    });
    this.emit();
  }

  clearAll(): void {
    this.selectedIds.set(new Set());
    this.emit();
  }

  toggleOpen(event: Event): void {
    event.stopPropagation();
    this.open.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  private emit(): void {
    const ids = this.selectedIds();
    const selected = ids.size === 0 ? [] : this.routes().filter(r => ids.has(r.id));
    this.selectionChange.emit(selected);
  }
}
