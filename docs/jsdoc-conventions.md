# JSDoc Conventions

Repota uses **signal-only JSDoc**: document contracts, domain invariants, units, call-order preconditions, failure modes, and _why_ — never restate what TypeScript signatures already express.

## Core Rule

If a TypeScript signature already tells an engineer or AI agent everything needed to use a symbol safely, leave it undocumented. Add JSDoc when a mistake would only be discovered by reading the implementation or multiple callers.

## Where JSDoc Belongs

- **Data models (`src/types/index.ts`)**: units/scales, ID conventions (e.g., `demo-` prefix), IndexedDB media reference formats (`idb-blob://`), and `@deprecated` compatibility fields.
- **Core utilities (`src/utils/`)**: domain math/grading rules, storage/backup guarantees, encryption/security boundaries, formula escaping, platform workarounds, and analytics privacy/deduplication contracts.
- **Context contracts & providers (`src/context/*Definition.ts`, providers, `DataGate`)**: mount-order preconditions, persistence suspension, recovery locking, and split-context subscription guarantees.
- **Custom hooks (`src/hooks/`)**: non-obvious slice subscription vs. fallback behavior or multi-channel side effects (`useSchoolData.ts`, `usePdfShareFlow.ts`).

## Where to Omit JSDoc

- Self-evident helpers (`hasMissingPhoto`, `getRandomInterest`, trivial getters/setters).
- Standard presentational components and route pages (`src/components/**`, `src/pages/**`), unless they enforce a non-obvious provider/lifecycle boundary (e.g., `DataGate`).
- Type annotations inside JSDoc (`@param {string}`, `@returns {boolean}`) — TypeScript owns all types.

## Approved Tags

Use tags sparingly, only when they add information missing from the signature:

- `@param name - ...` when a parameter has non-obvious units, defaults, or mutability/behavior flags (e.g., `silent`, `allowUnreadableCurrent`).
- `@returns` when return values have special edge-case semantics (e.g., `""` for `0`, `null` for `KG`, same array reference for `"DEFAULT"`).
- `@throws` for caller-handled error classes or validation failures (e.g., `IncompleteRollbackError`, empty CSV input errors).
- `@deprecated` for legacy fields preserved strictly for backup backward compatibility.

## Examples

Good — captures non-obvious platform/unit invariants:

```ts
/**
 * Stored weighted on `0..SchoolSettings.examScoreMax` (not raw `0..100`).
 * Convert UI/CSV inputs via `convertExamRawToWeighted` and `formatExamWeightedAsRaw`.
 */
examScore: number;

/**
 * Convert Uint8Array to Base64 string using chunks so large backups with photos
 * do not exceed WebKit/V8 maximum argument stack limits.
 */
function arrayToBase64(array: Uint8Array): string;
```

Avoid — repeats the TypeScript signature with zero new information:

```ts
/**
 * Convert Base64 string to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array;
```

## Tooling Policy

Enforced via code review and [docs/AGENTS.md](AGENTS.md). Repota intentionally does **not** install `eslint-plugin-jsdoc` so contributors are never forced to write boilerplate comments on self-explanatory functions.
