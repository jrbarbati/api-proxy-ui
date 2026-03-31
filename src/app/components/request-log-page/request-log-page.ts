import { Component, inject, signal, computed, OnInit, effect, ViewChild, ElementRef, HostListener } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { RequestsService } from '../../services/requests';
import { RoutesService } from '../../services/routes';
import { ToastService } from '../../services/toast';
import { DateRangeSelector } from '../date-range-selector/date-range-selector';
import { Request, Route, DateRange, rangeFromHours } from '../../models';
import { parseUTC } from '../../utils/date';

type SortCol = 'method' | 'status' | 'latency' | 'time';

@Component({
  selector: 'app-request-log-page',
  imports: [NgClass, DecimalPipe, DateRangeSelector],
  templateUrl: './request-log-page.html',
  styleUrl: './request-log-page.css',
})
export class RequestLogPage implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private readonly requestsSvc = inject(RequestsService);
  private readonly routesSvc = inject(RoutesService);
  private readonly toast = inject(ToastService);

  readonly PAGE_SIZE = 50;
  readonly METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

  readonly requests = signal<Request[]>([]);
  readonly routes = signal<Route[]>([]);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly selectedMethods = signal<Set<string>>(new Set());
  readonly selectedStatusFamily = signal<'all' | '2xx' | '3xx' | '4xx' | '5xx'>('all');
  readonly selectedRouteId = signal<number | null>(null);
  readonly urlSearch = signal('');
  readonly currentPage = signal(1);
  readonly activePresetHours = signal<number | null>(12);
  readonly sortCol = signal<SortCol | null>(null);
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly filteredRequests = computed(() => {
    let reqs = this.requests();

    const methods = this.selectedMethods();
    if (methods.size > 0) {
      reqs = reqs.filter(r => methods.has(r.method));
    }

    const family = this.selectedStatusFamily();
    if (family !== 'all') {
      const base = parseInt(family[0], 10) * 100;
      reqs = reqs.filter(r => r.status_code >= base && r.status_code < base + 100);
    }

    const routeId = this.selectedRouteId();
    if (routeId !== null) {
      reqs = reqs.filter(r => r.route_id === routeId);
    }

    const search = this.urlSearch().toLowerCase();
    if (search) {
      reqs = reqs.filter(r => r.url.toLowerCase().includes(search));
    }

    return reqs;
  });

  readonly sortedRequests = computed(() => {
    const col = this.sortCol();
    const dir = this.sortDir();
    const reqs = [...this.filteredRequests()];
    if (!col) return reqs;
    return reqs.sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (col) {
        case 'method':  va = a.method;       vb = b.method;       break;
        case 'status':  va = a.status_code;  vb = b.status_code;  break;
        case 'latency': va = a.latency;      vb = b.latency;      break;
        case 'time':    va = a.created_at;   vb = b.created_at;   break;
      }
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  readonly totalCount = computed(() => this.filteredRequests().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalCount() / this.PAGE_SIZE)));
  readonly pagedRequests = computed(() => {
    const p = this.currentPage();
    return this.sortedRequests().slice((p - 1) * this.PAGE_SIZE, p * this.PAGE_SIZE);
  });
  readonly routeMap = computed(() => new Map(this.routes().map(r => [r.id, r])));
  readonly activeRoutes = computed(() => this.routes().filter(r => !r.inactivated_at));
  readonly hasActiveMethodFilter = computed(() => this.selectedMethods().size > 0);

  constructor() {
    effect(() => {
      this.selectedMethods();
      this.selectedStatusFamily();
      this.selectedRouteId();
      this.urlSearch();
      this.currentPage.set(1);
    });
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const range = rangeFromHours(12);
      const [requests, routes] = await Promise.all([
        this.requestsSvc.getRequests(range.from, range.to),
        this.routesSvc.getRoutes(),
      ]);
      this.requests.set(requests);
      this.routes.set(routes);
    } catch {
      this.toast.error('Failed to load requests', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
    }
  }

  async onRangeChange(range: DateRange): Promise<void> {
    this.refreshing.set(true);
    this.currentPage.set(1);
    try {
      this.requests.set(await this.requestsSvc.getRequests(range.from, range.to));
    } catch {
      this.toast.error('Failed to load requests', 'Could not reach the API proxy.');
    } finally {
      this.refreshing.set(false);
    }
  }

  onPresetChange(hours: number | null): void {
    this.activePresetHours.set(hours);
  }

  toggleMethod(method: string): void {
    this.selectedMethods.update(set => {
      const next = new Set(set);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  }

  setStatusFamily(family: 'all' | '2xx' | '3xx' | '4xx' | '5xx'): void {
    this.selectedStatusFamily.set(family);
  }

  setRouteFilter(routeId: number | null): void {
    this.selectedRouteId.set(routeId);
  }

  resetFilters(): void {
    this.selectedMethods.set(new Set());
    this.selectedStatusFamily.set('all');
    this.selectedRouteId.set(null);
    this.urlSearch.set('');
  }

  sort(col: SortCol): void {
    if (this.sortCol() === col) {
      this.sortDir.update(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortCol.set(col);
      this.sortDir.set('desc');
    }
  }

  routeForRequest(req: Request): Route | null {
    if (req.route_id === null) return null;
    return this.routeMap().get(req.route_id) ?? null;
  }

  exportCSV(): void {
    const headers = ['ID', 'Method', 'URL', 'Status', 'Latency (ms)', 'Route', 'Backend URL', 'Time'];
    const rows = this.filteredRequests().map(req => {
      const route = this.routeForRequest(req);
      return [
        req.id,
        req.method,
        `"${req.url.replace(/"/g, '""')}"`,
        req.status_code,
        req.latency,
        route ? `"${route.method} ${route.pattern}"` : '',
        route ? `"${route.backend_url}"` : '',
        req.created_at,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(iso: string): string {
    return parseUTC(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatLatency(ms: number): string {
    return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(2) + 's';
  }

  latencyClass(ms: number): string {
    if (ms < 200) return 'latency--fast';
    if (ms < 1000) return 'latency--mid';
    return 'latency--slow';
  }

  statusClass(code: number): string {
    if (code >= 500) return 'status--5xx';
    if (code >= 400) return 'status--4xx';
    if (code >= 300) return 'status--3xx';
    if (code >= 200) return 'status--2xx';
    return '';
  }
}
