---
name: expo-notifications version by Expo SDK
description: Expo notifications versioning and local Metro resolution in the pnpm monorepo
---

# expo-notifications version by Expo SDK

**Rule:** Match `expo-notifications` to the Expo CLI compatibility check rather than its package major: SDK 54 uses `~0.32.0`, while SDK 57 uses `~57.0.17`. Install it directly in the mobile artifact package.

**Why:** expo-notifications versioning has not tracked Expo SDK majors consistently across releases. An unpinned install can select a package for a different SDK, and Expo CLI's compatibility warning is the source of truth.

**How to apply:** Always install the matching version into the artifact package so Metro can resolve it from the local `node_modules`; this pnpm monorepo cannot rely on a hoisted-only copy.
