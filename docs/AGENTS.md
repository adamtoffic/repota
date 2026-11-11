Rules for every task:

- Never change stored keys, schemas, or the backup file format.
- Package manager: Use npm and npx ONLY. Never use pnpm, yarn, or bun.
- No new dependencies unless the task says so.
- Before finishing: npm run lint, npx tsc -b, npm test -- --run.
- Commit when each goal is done, with a clear message.
- Write docs/reports/<task>.md: what changed, why, what you verified, what you could NOT verify, and a "Summary for reviewer" of max 10 lines.
