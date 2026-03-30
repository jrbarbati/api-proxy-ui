# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Dev server at http://localhost:4200/
ng build           # Production build → dist/
ng build --watch --configuration development  # Watch mode
ng test            # Run unit tests via Vitest
```

## Architecture

Angular 21 SPA using the **standalone component architecture** (no NgModules). The app bootstraps via `bootstrapApplication()` in `src/main.ts`.

Key conventions:
- Components live in `src/app/components/`
- Routes are defined in `src/app/app.routes.ts`
- Providers/app config in `src/app/app.config.ts`
- Signals-based state (root component uses signals)
- **No type suffixes in filenames** — use `auth.ts` not `auth.service.ts`, `login.ts` not `login.component.ts`, `org.ts` not `org.model.ts`. The directory (`services/`, `models/`, `components/`) provides the context.

## Stack

- **Angular 21** with strict TypeScript 5.9 (strict templates, strict injection)
- **Tailwind CSS 4** via PostCSS — utility classes in templates and `src/styles.css`
- **Vitest** for unit tests (not Jasmine/Jest)
- **Prettier** — 100-char width, single quotes, Angular HTML parser

## Light/Dark Mode

All components must support both light and dark themes. The app uses class-based dark mode via Tailwind CSS 4's `@custom-variant dark` — the `.dark` class is toggled on `<html>` by `ThemeService`.

- Design tokens (colors, backgrounds, borders) are defined as CSS custom properties in `src/styles.css` under `:root` (light) and `.dark` (dark)
- Component CSS references those global variables — do not hardcode color values in component CSS
- Use Tailwind's `dark:` utility prefix in templates where appropriate
- Every new component should be reviewed for both light and dark appearance before considering it complete

## TypeScript

Strict mode is fully enabled including `noImplicitReturns` and `noFallthroughCasesInSwitch`. The Angular compiler enforces strict templates and strict standalone imports. Run `ng build` to catch type errors.
