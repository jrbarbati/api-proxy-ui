import { Component, input, output, signal, computed } from '@angular/core';
import { NgClass } from '@angular/common';
import { DateRange, DatePreset, DATE_PRESETS, rangeFromHours, toDatetimeLocal } from '../../models';

@Component({
  selector: 'app-date-range-selector',
  imports: [NgClass],
  templateUrl: './date-range-selector.html',
  styleUrl: './date-range-selector.css',
})
export class DateRangeSelector {
  initialPresetHours = input<number>(12);
  rangeChange = output<DateRange>();
  presetChange = output<number | null>();

  readonly presets = DATE_PRESETS;
  readonly activePreset = signal<DatePreset | null>(DATE_PRESETS.find(p => p.hours === 12)!);
  readonly showCustom = signal(false);

  readonly customFrom = signal('');
  readonly customTo = signal('');

  readonly currentRange = computed<DateRange>(() => {
    const preset = this.activePreset();
    if (preset) return rangeFromHours(preset.hours);
    const from = new Date(this.customFrom());
    const to = new Date(this.customTo());
    return { from, to };
  });

  readonly rangeLabel = computed(() => {
    const r = this.currentRange();
    return `${this.fmt(r.from)} → ${this.fmt(r.to)}`;
  });

  selectPreset(preset: DatePreset): void {
    this.activePreset.set(preset);
    this.showCustom.set(false);
    this.presetChange.emit(preset.hours);
    this.rangeChange.emit(rangeFromHours(preset.hours));
  }

  openCustom(): void {
    const r = this.currentRange();
    this.customFrom.set(toDatetimeLocal(r.from));
    this.customTo.set(toDatetimeLocal(r.to));
    this.activePreset.set(null);
    this.showCustom.set(true);
  }

  applyCustom(): void {
    const from = new Date(this.customFrom());
    const to = new Date(this.customTo());
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return;
    this.showCustom.set(false);
    this.presetChange.emit(null);
    this.rangeChange.emit({ from, to });
  }

  getInitialRange(): DateRange {
    return rangeFromHours(this.initialPresetHours());
  }

  private fmt(d: Date): string {
    return d.toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
