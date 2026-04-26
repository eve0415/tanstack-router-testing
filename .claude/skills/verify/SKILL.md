---
name: verify
description: Use when you want to run the full verification suite — lint, type check, and unit tests
---

Run the full verification suite for this project. Execute these commands in sequence and report results:

1. `pnpm build` — build all packages
2. `pnpm run lint:check` — oxlint + oxfmt check
3. `pnpm test:unit:core` — core + integration tests
4. `pnpm test:types` — type-level assertions

Stop at the first failure and report the error. If all pass, report success.
