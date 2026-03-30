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

const FAMILIES = [
  { label: '2xx', color: '#3a8c62', test: (s: number) => s >= 200 && s < 300 },
  { label: '3xx', color: '#3a6e9e', test: (s: number) => s >= 300 && s < 400 },
  { label: '4xx', color: '#c8922a', test: (s: number) => s >= 400 && s < 500 },
  { label: '5xx', color: '#9e3a3a', test: (s: number) => s >= 500 },
] as const;

@Component({
  selector: 'app-latency-chart',
  template: `<canvas #canvas></canvas>`,
  styles: [':host { display: block; position: relative; width: 100%; height: 100%; } canvas { width: 100% !important; height: 100% !important; }'],
})
export class LatencyChart {
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
      type: 'line',
      data: {
        labels: [],
        datasets: FAMILIES.map(f => this.buildDataset(f.label, f.color, isDark)),
      },
      options: this.buildOptions(isDark),
    };

    this.chart = new Chart(ctx, config);
    this.updateData(this.data());
  }

  private updateData(requests: Request[]): void {
    if (!this.chart) return;

    // Build a sorted list of all unique timestamps as the shared x-axis
    const sorted = [...requests].sort(
      (a, b) => parseUTC(a.created_at).getTime() - parseUTC(b.created_at).getTime(),
    );
    const labels = sorted.map(r => this.formatTime(r.created_at));
    this.chart.data.labels = labels;

    // For each family, map latency at each position (null if that request isn't in this family)
    FAMILIES.forEach((family, i) => {
      this.chart!.data.datasets[i].data = sorted.map(r =>
        family.test(r.status_code) ? r.latency : null,
      ) as any;
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
    opts.plugins.legend.labels.color = textColor;
    opts.plugins.tooltip.backgroundColor = isDark ? '#0d1219' : '#ffffff';
    opts.plugins.tooltip.borderColor = isDark ? '#192130' : '#e2d9ce';
    opts.plugins.tooltip.bodyColor = isDark ? '#c8d6e0' : '#1c1610';

    FAMILIES.forEach((family, i) => {
      const existing = this.chart!.data.datasets[i];
      this.chart!.data.datasets[i] = {
        ...existing,
        ...this.buildDataset(family.label, family.color, isDark),
        data: existing.data,
      };
    });

    this.chart.update('none');
  }

  private buildDataset(label: string, color: string, isDark: boolean): any {
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
