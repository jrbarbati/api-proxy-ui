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

const STATUS_GROUPS = [
  { label: '2xx', color: '#3a8c62', test: (s: number) => s >= 200 && s < 300 },
  { label: '3xx', color: '#3a6e9e', test: (s: number) => s >= 300 && s < 400 },
  { label: '4xx', color: '#c8922a', test: (s: number) => s >= 400 && s < 500 },
  { label: '5xx', color: '#9e3a3a', test: (s: number) => s >= 500 },
];

@Component({
  selector: 'app-status-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [':host { display: block; position: relative; width: 100%; height: 100%; } canvas { width: 100% !important; height: 100% !important; }'],
})
export class StatusChart {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  data = input<Request[]>([]);

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

    effect(() => {
      const requests = this.data();
      if (this.chart) this.updateData(requests);
    });
  }

  private initChart(): void {
    const ctx = this.canvasRef.nativeElement.getContext('2d')!;
    const isDark = this.theme.isDark();

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: [],
        datasets: STATUS_GROUPS.map(g => ({
          label: g.label,
          data: [],
          backgroundColor: g.color + 'cc',
          borderColor: g.color,
          borderWidth: 1,
          borderRadius: 2,
        })),
      },
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
    STATUS_GROUPS.forEach((group, i) => {
      this.chart!.data.datasets[i].data = labels.map(l =>
        buckets[l].filter(r => group.test(r.status_code)).length,
      );
    });
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
    opts.plugins.tooltip.backgroundColor = isDark ? '#0d1219' : '#ffffff';
    opts.plugins.tooltip.borderColor = isDark ? '#192130' : '#e2d9ce';
    opts.plugins.tooltip.bodyColor = isDark ? '#c8d6e0' : '#1c1610';
    this.chart.update('none');
  }

  private buildOptions(isDark: boolean): any {
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#3e5162' : '#9a8878';
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
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
          titleColor: '#c8922a',
          bodyColor: isDark ? '#c8d6e0' : '#1c1610',
          titleFont: { family: "'DM Mono', monospace", size: 11 },
          bodyFont: { family: "'Outfit', sans-serif", size: 12 },
          padding: 10,
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: "'DM Mono', monospace", size: 10 },
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          stacked: true,
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
