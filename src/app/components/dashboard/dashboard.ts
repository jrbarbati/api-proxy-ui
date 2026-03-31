import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RequestsService } from '../../services/requests';
import { RoutesService } from '../../services/routes';
import { ToastService } from '../../services/toast';
import { LatencyChart } from '../charts/latency-chart/latency-chart';
import { StatusChart } from '../charts/status-chart/status-chart';
import { RatePressureChart } from '../charts/rate-pressure-chart/rate-pressure-chart';
import { RouteFilter } from '../route-filter/route-filter';
import { DateRangeSelector } from '../date-range-selector/date-range-selector';
import { Request, Route, DateRange, rangeFromHours } from '../../models';

const AUTO_REFRESH_MS = 120_000;

interface TopRoute {
  route: Route;
  count: number;
  pct: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [LatencyChart, StatusChart, RatePressureChart, RouteFilter, DateRangeSelector, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private readonly requestsSvc = inject(RequestsService);
  private readonly routesSvc = inject(RoutesService);
  private readonly toast = inject(ToastService);

  readonly requests = signal<Request[]>([]);
  readonly comparisonRequests = signal<Request[]>([]);
  readonly routes = signal<Route[]>([]);
  readonly selectedRoutes = signal<Route[]>([]);
  readonly exclude429s = signal(true);
  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly latencyMode = signal<'family' | 'percentile'>('family');

  // Auto-refresh state
  readonly activePresetHours = signal<number | null>(12);
  readonly lastRefreshed = signal<Date | null>(null);
  readonly justRefreshed = signal(false);
  readonly ringVisible = signal(true);

  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private lastRange: DateRange = rangeFromHours(12);

  readonly filteredRequests = computed(() => {
    let reqs = this.requests();
    const selected = this.selectedRoutes();
    if (selected.length) {
      const selectedIds = new Set(selected.map(r => r.id));
      reqs = reqs.filter(req => req.route_id !== null && selectedIds.has(req.route_id));
    }
    if (this.exclude429s()) reqs = reqs.filter(r => r.status_code !== 429);
    return reqs;
  });

  readonly prevFilteredRequests = computed(() => {
    let reqs = this.comparisonRequests();
    const selected = this.selectedRoutes();
    if (selected.length) {
      const selectedIds = new Set(selected.map(r => r.id));
      reqs = reqs.filter(req => req.route_id !== null && selectedIds.has(req.route_id));
    }
    if (this.exclude429s()) reqs = reqs.filter(r => r.status_code !== 429);
    return reqs;
  });

  readonly totalRequests = computed(() => this.filteredRequests().length);

  readonly avgLatency = computed(() => {
    const reqs = this.filteredRequests();
    if (!reqs.length) return 0;
    return Math.round(reqs.reduce((s, r) => s + r.latency, 0) / reqs.length);
  });

  readonly p95Latency = computed(() => {
    const lats = [...this.filteredRequests()].map(r => r.latency).sort((a, b) => a - b);
    if (!lats.length) return 0;
    return lats[Math.floor(lats.length * 0.95)];
  });

  readonly errorRate = computed(() => {
    const reqs = this.filteredRequests();
    if (!reqs.length) return '0.0';
    return ((reqs.filter(r => r.status_code >= 400).length / reqs.length) * 100).toFixed(1);
  });

  // Comparison computeds
  private readonly prevAvgLatency = computed(() => {
    const reqs = this.prevFilteredRequests();
    if (!reqs.length) return 0;
    return Math.round(reqs.reduce((s, r) => s + r.latency, 0) / reqs.length);
  });

  private readonly prevP95Latency = computed(() => {
    const lats = [...this.prevFilteredRequests()].map(r => r.latency).sort((a, b) => a - b);
    if (!lats.length) return 0;
    return lats[Math.floor(lats.length * 0.95)];
  });

  private readonly prevErrorRate = computed(() => {
    const reqs = this.prevFilteredRequests();
    if (!reqs.length) return 0;
    return (reqs.filter(r => r.status_code >= 400).length / reqs.length) * 100;
  });

  readonly deltaTotal = computed(() => this.delta(this.totalRequests(), this.prevFilteredRequests().length));
  readonly deltaAvgLatency = computed(() => this.delta(this.avgLatency(), this.prevAvgLatency()));
  readonly deltaP95 = computed(() => this.delta(this.p95Latency(), this.prevP95Latency()));
  readonly deltaErrorRate = computed(() => this.delta(parseFloat(this.errorRate()), this.prevErrorRate()));

  readonly topRoutes = computed((): TopRoute[] => {
    const countMap = new Map<number, number>();
    for (const req of this.filteredRequests()) {
      if (req.route_id !== null) {
        countMap.set(req.route_id, (countMap.get(req.route_id) ?? 0) + 1);
      }
    }
    const total = this.filteredRequests().length || 1;
    return [...countMap.entries()]
      .map(([routeId, count]) => ({
        route: this.routes().find(r => r.id === routeId)!,
        count,
        pct: (count / total) * 100,
      }))
      .filter(e => !!e.route)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });

  async ngOnInit(): Promise<void> {
    try {
      const initialRange = rangeFromHours(12);
      this.lastRange = initialRange;
      const [requests, comparison, routes] = await Promise.all([
        this.requestsSvc.getRequests(initialRange.from, initialRange.to),
        this.requestsSvc.getRequests(this.prevRange(initialRange).from, this.prevRange(initialRange).to),
        this.routesSvc.getRoutes(),
      ]);
      this.requests.set(requests);
      this.comparisonRequests.set(comparison);
      this.routes.set(routes);
      this.lastRefreshed.set(new Date());
    } catch {
      this.toast.error('Failed to load data', 'Could not reach the API proxy.');
    } finally {
      this.loading.set(false);
      this.startAutoRefresh();
    }
  }

  ngOnDestroy(): void {
    if (this.autoTimer) clearInterval(this.autoTimer);
  }

  async onRangeChange(range: DateRange): Promise<void> {
    this.lastRange = range;
    this.resetTimer();
    await this.fetchRequests(range);
    this.lastRefreshed.set(new Date());
    this.flashRefreshed();
  }

  onPresetChange(hours: number | null): void {
    this.activePresetHours.set(hours);
  }

  onRouteFilterChange(routes: Route[]): void {
    this.selectedRoutes.set(routes);
  }

  async manualRefresh(): Promise<void> {
    if (this.refreshing()) return;
    this.resetTimer();
    await this.doRefresh();
  }

  formatRefreshTime(d: Date): string {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatDelta(d: number | null): string {
    if (d === null) return '';
    return `${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
  }

  private async fetchRequests(range: DateRange): Promise<void> {
    this.refreshing.set(true);
    try {
      const prev = this.prevRange(range);
      const [requests, comparison] = await Promise.all([
        this.requestsSvc.getRequests(range.from, range.to),
        this.requestsSvc.getRequests(prev.from, prev.to),
      ]);
      this.requests.set(requests);
      this.comparisonRequests.set(comparison);
    } catch {
      this.toast.error('Failed to load requests', 'Could not reach the API proxy.');
    } finally {
      this.refreshing.set(false);
    }
  }

  private async doRefresh(): Promise<void> {
    if (this.refreshing()) return;
    const hours = this.activePresetHours();
    const range = hours !== null ? rangeFromHours(hours) : this.lastRange;
    await this.fetchRequests(range);
    this.lastRefreshed.set(new Date());
    this.flashRefreshed();
  }

  private startAutoRefresh(): void {
    this.autoTimer = setInterval(() => {
      this.resetRingAnimation();
      this.doRefresh().catch(() => {});
    }, AUTO_REFRESH_MS);
  }

  private resetTimer(): void {
    if (this.autoTimer) clearInterval(this.autoTimer);
    this.resetRingAnimation();
    this.startAutoRefresh();
  }

  private resetRingAnimation(): void {
    this.ringVisible.set(false);
    setTimeout(() => this.ringVisible.set(true), 16);
  }

  private flashRefreshed(): void {
    this.justRefreshed.set(true);
    setTimeout(() => this.justRefreshed.set(false), 700);
  }

  private prevRange(range: DateRange): DateRange {
    const dur = range.to.getTime() - range.from.getTime();
    return { from: new Date(range.from.getTime() - dur), to: new Date(range.from.getTime()) };
  }

  private delta(curr: number, prev: number): number | null {
    if (!prev) return null;
    return ((curr - prev) / prev) * 100;
  }
}
