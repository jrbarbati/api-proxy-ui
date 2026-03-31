import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  effect,
  afterNextRender,
} from '@angular/core';
import { Chart, type ChartConfiguration } from 'chart.js/auto';
import { Request } from '../../../models';
import { ThemeService } from '../../../services/theme';
import { parseUTC } from '../../../utils/date';

@Component({
  selector: 'app-rate-pressure-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [':host { display: block; position: relative; width: 100%; height: 100%; } canvas { width: 100% !important; height: 100% !important; }'],
})
export class RatePressureChart {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  data = input<Request[]>([]);

  private chart: Chart | null = null;
  private readonly theme = inject(ThemeService);

  constructor() {
    afterNextRender(() => { this.initChart(); });

    effect(() => { this.applyTheme(this.theme.isDark()); });

    effect(() => {
      const requests = this.data();
      if (this.chart) this.updateData(requests);
    });
  }

  private initChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const isDark = this.theme.isDark();

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: { labels: [], datasets: this.buildDatasets(isDark) },
      options: this.buildOptions(isDark),
    };

    this.chart = new Chart(ctx, config);
    this.updateData(this.data());
  }

  private updateData(requests: Request[]): void {
    if (!this.chart) return;

    const buckets = this.bucketByHour(requests);
    const labels = Object.keys(buckets).sort();

    this.chart.data.labels = labels.map(l => this.formatBucket(l));
    // Dataset 0: total per bucket
    this.chart.data.datasets[0].data = labels.map(l => buckets[l].length);
    // Dataset 1: 429s per bucket
    this.chart.data.datasets[1].data = labels.map(l => buckets[l].filter(r => r.status_code === 429).length);

    this.chart.update('none');
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

    const datasets = this.buildDatasets(isDark);
    this.chart.data.datasets.forEach((ds, i) => {
      Object.assign(ds, { ...datasets[i], data: ds.data });
    });
    this.chart.update('none');
  }

  private buildDatasets(isDark: boolean): any[] {
    return [
      {
        label: 'Total',
        data: [],
        backgroundColor: isDark ? 'rgba(200,146,42,0.12)' : 'rgba(200,146,42,0.10)',
        borderColor: isDark ? 'rgba(200,146,42,0.3)' : 'rgba(200,146,42,0.25)',
        borderWidth: 1,
        borderRadius: 2,
        order: 2,
      },
      {
        label: '429s',
        data: [],
        backgroundColor: 'rgba(158,58,58,0.75)',
        borderColor: '#9e3a3a',
        borderWidth: 1,
        borderRadius: 2,
        order: 1,
      },
    ];
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
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0d1219' : '#ffffff',
          borderColor: isDark ? '#192130' : '#e2d9ce',
          borderWidth: 1,
          titleColor: '#9e3a3a',
          bodyColor: isDark ? '#c8d6e0' : '#1c1610',
          titleFont: { family: "'DM Mono', monospace", size: 11 },
          bodyFont: { family: "'DM Mono', monospace", size: 11 },
          padding: 10,
          callbacks: {
            afterBody: (items: any[]) => {
              const total = items.find(i => i.dataset.label === 'Total')?.parsed.y ?? 0;
              const hits = items.find(i => i.dataset.label === '429s')?.parsed.y ?? 0;
              if (!total) return [];
              return [`  Rate: ${((hits / total) * 100).toFixed(1)}% limited`];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            precision: 0,
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
    };
  }

  private bucketByHour(requests: Request[]): Record<string, Request[]> {
    const buckets: Record<string, Request[]> = {};
    for (const r of requests) {
      const d = parseUTC(r.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(r);
    }
    return buckets;
  }

  private formatBucket(key: string): string {
    const [year, month, day, hour] = key.split('-').map(Number);
    const d = new Date(year, month, day, hour);
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' });
  }
}
