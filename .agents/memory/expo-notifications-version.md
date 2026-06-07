---
name: expo-notifications version for SDK 54
description: Correct expo-notifications package version and Metro resolution for Expo SDK 54 pnpm monorepo
---

# expo-notifications version for SDK 54

**Rule:** For Expo SDK 54, install `expo-notifications@~0.32.0`. Do NOT install `~0.29.x` (too old) or `~56.x` (Expo SDK 56).

**Why:** expo-notifications versioning does not track SDK major versions consistently. `pnpm add expo-notifications` without a pin will resolve to the latest (SDK 56 era), which is incompatible. Expo CLI's version warning is the source of truth — check it after install.

**How to apply:** Always install into the artifact package directly (`pnpm --filter @workspace/safe-alert add expo-notifications@~0.32.0`) so Metro can resolve it from the local `node_modules`. Metro cannot resolve hoisted-only pnpm packages in this monorepo setup — the package must appear in the artifact's own `node_modules`.
