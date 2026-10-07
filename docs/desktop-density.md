# Desktop density foundation

BizReply is designed for normal (100%) browser zoom. This change adjusts shared dimensions, not browser zoom or the root font size.

## Audit and decisions

The existing system uses Inter/Sora, semantic light/dark colors, a 16px root, Tailwind rem utilities, Radix positioning and shared App primitives. The supplied Notion audit recommends a consistent spacing rhythm and restrained hierarchy, but supplies no exact replacement font or color values. Existing visual identity and business logic are retained.

| Dimension | Before | Desktop (1024px+) |
| --- | --- | --- |
| Shell header | 64px | 56px |
| Expanded sidebar / rail | 280px / 72px | 240px / 64px |
| Standard controls | 44px | 40px |
| Large controls | 48px | 44px |
| Shared card padding | 24px | 20px |
| Main page padding | up to 32px | 24px |
| Primary titles | up to 30–36px | 26px |
| Section titles in settings | 24px | 20px |
| Section / component gaps | commonly 32px / 24px | 24px / 16px |
| Knowledge table rows | about 68px | about 48px |

Tokens live in `app/globals.css` and are mapped to semantic Tailwind utilities (`h-control`, `p-card`, `lg:p-page`, `lg:text-page-title`, etc.). The root stays 16px; body text, small metadata/badges, multiline textareas, calendar units, and chart geometry are unchanged. Mobile/tablet retain their previous control heights and page spacing; coarse-pointer desktop devices retain 44px controls. Portal content inherits the root tokens.

Shared buttons, inputs, selects, date/time pickers, cards, confirmation dialogs, detail panels, sidebar and shell consume the tokens. Existing page containers adopt the same spacing utilities. Settings uses a smaller desktop dialog while preserving Radix focus/positioning behavior. The inbox toolbar wraps rather than squeezing search against a fixed 860px filter strip. Knowledge table columns scroll inside their container instead of being clipped.

No state, hooks, event handlers, API clients, authentication guards or data structures are changed. Production and existing local demo work remain separate.

## Validation

- `pnpm lint`: passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm exec vitest run --maxWorkers=1`: 45 tests passed. Default parallel workers timed out during startup on this machine; the single-worker run completed without errors.
- `pnpm build`: passed.
- Local browser checks use the existing mock-auth environment and normal UI login. No credentials or authentication code were changed.
- Inbox checked at 375, 768, 1024, 1280, 1440 and 1920px: no document horizontal overflow; 64px header/44px input below desktop and 56px header/40px input at desktop; 16px root throughout.
- Visually reviewed Dashboard, Inbox, Leads, Appointments, Services, Knowledge Hub, Settings dialog and WhatsApp settings. Dashboard, appointments, services and knowledge used existing mock data; Inbox, Leads and WhatsApp were limited to their backend-unavailable/error states. Settings opened with focus on its close control and closed with Escape.
- Some modules require the live backend even in mock mode. Their populated data, realtime behavior and backend mutations are not verified by this visual pass.

## Future UI work

Use shared density tokens for new workspace controls and containers. Keep small badges legible and large touch-device controls comfortable. Avoid page transforms, CSS zoom and arbitrary one-off reductions. Review both desktop and touch layouts when adding exceptions.
