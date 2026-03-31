import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  effect,
  afterNextRender,
  untracked,
} from '@angular/core';
import { Chart, type ChartConfiguration } from 'chart.js/auto';
import { Request } from '../../../models';
import { ThemeService } from '../../../services/theme';
import { parseUTC } from '../../../utils/date';

const FAMILIES = [
  { label: '2xx', color: '#3a8c62', test: (s: number) => s >= 200 && s < 300 },
  { label: '3xx', color: '#3a6e9e', test: (s: number) => s >= 300 && s < 400 },
  { label: '4xx', color: '#c8922a', test: (s: number) => s >= 400 && s < 500 },
  { label: '5xx', color: '#9e3a3a', test: (s: number) => s >= 500 },
] as const;

const PERCENTILES = [
  { label: 'p50', color: '#3a8c62', p: 0.50 },
  { label: 'p75', color: '#3a6e9e', p: 0.75 },
  { label: 'p95', color: '#c8922a', p: 0.95 },
  { label: 'p99', color: '#9e3a3a', p: 0.99 },
] as const;

@Component({
  selector: 'app-latency-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [':host { display: block; position: relative; width: 100%; height: 100%; } canvas { width: 100% !important; height: 100% !important; }'],
})
export class LatencyChart {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  data = input<Request[]>([]);
  mode = input<'family' | 'percentile'>('family');

  private chart: Chart | null = null;
  private readonly theme = inject(ThemeService);

  constructor() {
    afterNextRender(() => {
      this.initChart();
    });

    effect(() => {
      const isDark = this.theme.isDark();
      this.applyTheme(isDark);
    });

    // Re-render whenever data OR mode changes
    effect(() => {
      const requests = this.data();
      const m = this.mode();
      if (!this.chart) return;
      const isDark = untracked(() => this.theme.isDark());
      const items = m === 'family' ? FAMILIES : PERCENTILES;
      this.chart.data.datasets = items.map(item => this.buildDataset(item.label, item.color, isDark));
      this.updateData(requests, m);
    });
  }

  private initChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const isDark = this.theme.isDark();
    const m = this.mode();
    const items = m === 'family' ? FAMILIES : PERCENTILES;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: [],
        datasets: items.map(item => this.buildDataset(item.label, item.color, isDark)),
      },
      options: this.buildOptions(isDark),
    };

    this.chart = new Chart(ctx, config);
    this.updateData(this.data(), m);
  }

  private updateData(requests: Request[], mode: 'family' | 'percentile'): void {
    if (!this.chart) return;
    if (mode === 'family') {
      this.updateFamilyData(requests);
    } else {
      this.updatePercentileData(requests);
    }
    this.chart.update('none');
  }

  private updateFamilyData(requests: Request[]): void {
    const sorted = [...requests].sort(
      (a, b) => parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime(),
    );
    this.chart!.data.labels = sorted.map(r => this.formatTime(r.created_at));
    FAMILIES.forEach((family, i) => {
      this.chart!.data.datasets[i].data = sorted.map(r =>
        family.test(r.status_code) ? r.latency : null,
      ) as any;
    });
  }

  private updatePercentileData(requests: Request[]): void {
    if (!requests.length) {
      PERCENTILES.forEach((_, i) => { this.chart!.data.datasets[i].data = []; });
      this.chart!.data.labels = [];
      return;
    }

    // Determine bucket size from data span
    const times = requests.map(r => parseUTC(r.created_at).getTime());
    const spanMs = Math.max(...times) - Math.min(...times);
    const bucketMs =
      spanMs < 2 * 3_600_000  ? 5 * 60_000   // < 2h  → 5-min buckets
      : spanMs < 12 * 3_600_000 ? 15 * 60_000  // < 12h → 15-min buckets
      : spanMs < 48 * 3_600_000 ? 30 * 60_000  // < 48h → 30-min buckets
      : 3_600_000;                               // else  → 1-hour buckets

    // Group into buckets
    const bucketMap = new Map<number, number[]>();
    for (const req of requests) {
      const t = parseUTC(req.created_at).getTime();
      const key = Math.floor(t / bucketMs) * bucketMs;
      if (!bucketMap.has(key)) bucketMap.set(key, []);
      bucketMap.get(key)!.push(req.latency);
    }

    const buckets = [...bucketMap.entries()].sort(([a], [b]) => a - b);
    this.chart!.data.labels = buckets.map(([key]) =>
      new Date(key).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    );

    PERCENTILES.forEach((pc, i) => {
      this.chart!.data.datasets[i].data = buckets.map(([, latencies]) => {
        const sorted = [...latencies].sort((a, b) => a - b);
        return sorted[Math.max(0, Math.floor((sorted.length - 1) * pc.p))];
      }) as any;
    });
  }

  private applyTheme(isDark: boolean): void {
    if (!this.chart) return;
    const opts = this.chart.options as any;
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#3e5162' : '#9a8878';
    opts.scales.x.ticks.color = textColor;
    opts.scales.y.ticks.color = textColor;
    opts.scales.x.grid.color = gridColor;
    opts.scales.y.grid.color = gridColor;
    opts.plugins.legend.labels.color = textColor;
    opts.plugins.tooltip.backgroundColor = isDark ? '#0d1219' : '#ffffff';
    opts.plugins.tooltip.borderColor = isDark ? '#192130' : '#e2d9ce';
    opts.plugins.tooltip.bodyColor = isDark ? '#c8d6e0' : '#1c1610';

    const m = this.mode();
    const items = m === 'family' ? FAMILIES : PERCENTILES;
    items.forEach((item, i) => {
      const existing = this.chart!.data.datasets[i];
      this.chart!.data.datasets[i] = {
        ...existing,
        ...this.buildDataset(item.label, item.color, isDark),
        data: existing.data,
      };
    });
    this.chart.update('none');
  }

  private buildDataset(label: string, color: string, _isDark: boolean): any {
    return {
      label,
      data: [],
      borderColor: color,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBackgroundColor: color,
      pointBorderColor: 'transparent',
      fill: false,
      tension: 0.3,
      spanGaps: false,
    };
  }

  private buildOptions(isDark: boolean): any {
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#3e5162' : '#9a8878';
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            boxWidth: 20,
            boxHeight: 1,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0d1219' : '#ffffff',
          borderColor: isDark ? '#192130' : '#e2d9ce',
          borderWidth: 1,
          titleColor: textColor,
          bodyColor: isDark ? '#c8d6e0' : '#1c1610',
          titleFont: { family: "'DM Mono', monospace", size: 10 },
          bodyFont: { family: "'DM Mono', monospace", size: 11 },
          padding: 10,
          filter: (item: any) => item.parsed.y !== null,
          callbacks: {
            label: (ctx: any) => ` ${ctx.dataset.label}  ${ctx.parsed.y} ms`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            maxTicksLimit: 8,
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            callback: (val: any) => `${val}ms`,
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
    };
  }

  private formatTime(iso: string): string {
    return parseUTC(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
