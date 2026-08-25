# Cockpit conventions

- **No inline features.** Screens orchestrate; features live in dedicated
  modules:
  - stateful logic → `src/hooks/` (e.g. `use-correction.ts`)
  - API / pure logic → `src/lib/`
  - reusable UI blocks → `src/components/`
- Expo HAS CHANGED — read the exact versioned docs at
  https://docs.expo.dev/versions/v57.0.0/ before writing any code.
