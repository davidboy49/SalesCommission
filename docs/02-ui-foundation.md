# UI foundation

How the frontend is built, so new screens look and behave like the existing ones.

## Stack

- Angular 22 (standalone components, signals, lazy routes) with Angular Material 3.
- Fonts are self-hosted (Source Sans 3, Material Icons): nothing loads from a CDN, so the app works
  offline and on a locked-down server.
- The browser calls a relative `/api`. `ng serve` proxies it to the API (`frontend/proxy.conf.json`);
  a reverse proxy does the same in production.

## Theme

- `src/styles/_theme-colors.scss` is generated from the brand teal `#0f766e` and amber `#b45309`.
  Regenerate with `ng generate @angular/material:m3-theme` if the brand colours change.
- `src/styles/_theme.scss` applies it. All colours are `light-dark()` tokens (`--mat-sys-*`), so the
  `color-scheme` on `<html>` switches the whole app. `ThemeService` stores the choice (light, dark or
  follow the system) and sets `data-theme`.
- `src/styles/_tokens.scss` holds the spacing scale (`--app-space-*`) and the fixed status colours
  (`--app-good`, `--app-warning`, `--app-critical`).
- Use `var(--mat-sys-*)` and `var(--app-*)` in component styles. Never write a literal colour.

## Shared components (`src/app/shared`)

| Component | Use it for |
|---|---|
| `app-page-header` | Title, one line of context, optional back link, actions on the right |
| `app-stat-tile` | A headline number. Only when the figure is the point of the page |
| `app-chart-card` | Magnitude charts (bars or columns) with tooltip and a table view |
| `app-state` | Loading, empty and error views. No data view is ever blank |
| `app-status-chip` | Any status. Always an icon plus a word, never colour alone |
| `app-achievement-bar` | Achievement against target. The number is always shown |
| `Confirm` service | Ask before replacing or removing work. The button names the action |
| `Notifier` service | Toasts: success disappears, errors stay until dismissed |
| `money`, `pct`, `kpiValue` pipes | All number formatting, so figures look the same everywhere |

## Rules the screens follow

- **Summary first, detail below.** Tiles, then charts, then tables.
- **Status is icon + label.** The four status colours are fixed and are not reused as series colours.
- **Charts** use one hue for magnitude, label values directly, show a tooltip on hover and focus, and
  can be read as a table. Never two y-axes.
- **Tables** keep cells on one line and scroll inside their own container, never the page.
- **Phones first for reps.** `/me` is one column with large numbers and no tables. Nothing scrolls
  sideways at 375px.
- **Everything is reachable by keyboard**, with a skip link, visible focus and labelled controls.
- **Every list has loading, empty and error states** with a way to retry.

## Checks

```powershell
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend test -- --watch=false
npm --prefix frontend run build
```

CI (`.github/workflows/ci.yml`) runs the same four for the frontend and build plus tests for the
backend. The production build enforces a 500 kB initial-bundle warning and a 1 MB error.
