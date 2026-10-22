import { Component, computed, input, signal } from '@angular/core';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

export interface ChartRow {
  label: string;
  value: number;
  /** Formatted value shown next to the mark. */
  display: string;
  /** Longer description for the tooltip and the table view. */
  detail?: string;
}

/**
 * A magnitude chart in one hue: horizontal bars to compare named things, columns for a distribution.
 * Every chart can be read as a table, marks have a hover/focus tooltip, and values are labelled directly.
 */
@Component({
  selector: 'app-chart-card',
  imports: [MatButtonToggleGroup, MatButtonToggle, MatIcon, MatTooltip],
  template: `
    <section class="card">
      <div class="head">
        <div>
          <h2>{{ title() }}</h2>
          @if (subtitle()) {
            <p class="muted">{{ subtitle() }}</p>
          }
        </div>
        <mat-button-toggle-group
          class="view-toggle"
          hideSingleSelectionIndicator
          [value]="view()"
          (change)="view.set($event.value)"
          [aria-label]="'View ' + title() + ' as chart or table'"
        >
          <mat-button-toggle value="chart" aria-label="Chart"
            ><mat-icon>bar_chart</mat-icon></mat-button-toggle
          >
          <mat-button-toggle value="table" aria-label="Table"
            ><mat-icon>table_rows</mat-icon></mat-button-toggle
          >
        </mat-button-toggle-group>
      </div>

      @if (view() === 'table') {
        <div class="table-scroll">
          <table>
            <caption class="sr-only">
              {{
                title()
              }}
            </caption>
            <thead>
              <tr>
                <th scope="col">{{ labelHeader() }}</th>
                <th scope="col" class="num">{{ valueHeader() }}</th>
                <th scope="col">Detail</th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.label) {
                <tr>
                  <th scope="row">{{ r.label }}</th>
                  <td class="num">{{ r.display }}</td>
                  <td class="muted">{{ r.detail ?? '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (kind() === 'bars') {
        <ul class="bars">
          @for (r of rows(); track r.label) {
            <li tabindex="0" [matTooltip]="r.detail ?? ''" [matTooltipDisabled]="!r.detail">
              <span class="name">{{ r.label }}</span>
              <span class="track"><span class="fill" [style.width.%]="scale(r, 100)"></span></span>
              <span class="val">{{ r.display }}</span>
            </li>
          }
        </ul>
      } @else {
        <div class="cols" role="list">
          @for (r of rows(); track r.label; let i = $index) {
            @if (i === markerBefore()) {
              <div class="marker" aria-hidden="true"><span>Target</span></div>
            }
            <div
              class="col"
              role="listitem"
              tabindex="0"
              [matTooltip]="r.detail ?? ''"
              [matTooltipDisabled]="!r.detail"
            >
              <span class="count">{{ r.display }}</span>
              <span class="stick" [style.height.%]="scale(r, 70)"></span>
              <span class="lbl">{{ r.label }}</span>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--app-space-3);
      margin-bottom: var(--app-space-4);
    }
    .head p {
      font: var(--mat-sys-body-small);
    }
    .view-toggle {
      --mat-button-toggle-height: 36px;
      flex: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th,
    td {
      padding: var(--app-space-2) var(--app-space-2);
      text-align: left;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
      font-weight: 400;
    }
    thead th {
      font: var(--mat-sys-label-medium);
      color: var(--mat-sys-on-surface-variant);
    }
    tbody th {
      font-weight: 500;
    }
    th.num,
    td.num {
      text-align: right;
    }

    /* horizontal bars */
    .bars {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--app-space-1);
    }
    .bars li {
      display: grid;
      grid-template-columns: minmax(96px, 1.1fr) 2fr auto;
      align-items: center;
      gap: var(--app-space-3);
      padding: var(--app-space-1) var(--app-space-2);
      border-radius: var(--mat-sys-corner-small);
    }
    .bars li:hover,
    .bars li:focus-visible {
      background: var(--mat-sys-surface-container-high);
      outline: none;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .track {
      height: 14px;
      display: block;
    }
    .fill {
      display: block;
      height: 100%;
      min-width: 2px;
      /* rounded at the data end, square on the baseline */
      border-radius: 0 4px 4px 0;
      background: var(--mat-sys-primary);
    }
    .val {
      font-variant-numeric: tabular-nums;
      min-width: 6ch;
      text-align: right;
    }

    /* columns */
    .cols {
      display: flex;
      align-items: stretch;
      gap: var(--app-space-2);
      height: 210px;
    }
    .col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      gap: var(--app-space-1);
      border-radius: var(--mat-sys-corner-small);
      padding: var(--app-space-1);
    }
    .col:hover,
    .col:focus-visible {
      background: var(--mat-sys-surface-container-high);
      outline: none;
    }
    .count {
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .stick {
      display: block;
      width: 70%;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: var(--mat-sys-primary);
    }
    .lbl {
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
      margin-top: var(--app-space-1);
    }
    .marker {
      position: relative;
      width: 0;
      border-left: 1px dashed var(--mat-sys-outline);
      margin-bottom: 20px;
    }
    .marker span {
      position: absolute;
      top: 0;
      left: 6px;
      font: var(--mat-sys-label-small);
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class ChartCard {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly rows = input.required<ChartRow[]>();
  readonly kind = input<'bars' | 'columns'>('bars');
  readonly labelHeader = input('Name');
  readonly valueHeader = input('Value');
  /** Column index in front of which a dashed "Target" divider is drawn. */
  readonly markerBefore = input<number>();

  protected readonly view = signal<'chart' | 'table'>('chart');
  private readonly max = computed(() => Math.max(...this.rows().map((r) => r.value), 1));

  protected scale(row: ChartRow, fullScale: number): number {
    return Math.round((row.value / this.max()) * fullScale);
  }
}
