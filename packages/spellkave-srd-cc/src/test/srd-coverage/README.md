# Executable SRD evidence: fresh-session recipe

The test declaration is the record; generated Markdown is only a projection.
Never add a status row, finding array, or parallel unit checklist. Start at
[`ledger/STATUS.md`](../../../ledger/STATUS.md), follow a generated entry to its
test, and keep new evidence beside the closest stable assertion.

## Read the states literally

- `✅ proven`: a normal assertion executed and passed.
- `❌ reproduced`: the desired assertion executed and failed under Vitest
  `it.fails`; this is logical RED while the known gap keeps CI green.
- `⚠️ unencoded`: an explicit `todo`; no assertion exists yet, so this is not a
  reproduced defect.
- `⏸ not run`: the declaration was skipped, normally because its live node was
  unavailable.
- `⚠️ undeclared`: an applicable coverage axis has no declaration.
- `➖ n/a`: an explicit, justified non-source exception.
- `💥 failed`: the ordinary test lane failed.

## Record a new finding RED first

Reproduce before applying a workaround. Choose the next permanent numeric ID
by searching existing `findingGap` and `findingEvidence` declarations;
duplicate IDs fail report generation. Put the desired behavior in the
assertion, not an always-failing sentinel:

```ts
findingGap(
	{
		id: "92",
		title: "Concrete user-visible failure",
		expected: "The supported public surface returns the required result.",
		observed: "The same call currently omits that result.",
		impact: "A consumer cannot complete the workflow without a bypass.",
		references: ["https://example.com/issues/0000"],
	},
	() => {
		// Assert the desired public behavior. This must currently fail.
		expect(supportedSurface()).toEqual(requiredResult);
	},
);
```

`findingGap` runs the callback through `it.fails`. If a fix makes the desired
assertion pass, Vitest deliberately fails the lane. Complete the RED-to-GREEN
transition by changing only the wrapper to `findingEvidence`; keep the metadata
and assertion unchanged. A later regression then fails the normal test lane.

If the desired public behavior cannot be expressed as an assertion, do not
record a finding yet. Settle the requirement and execution surface in an issue
or design first; the first ledger-visible declaration is always executable.

## Record SRD coverage at the proving test

Wrap an existing assertion with `srdEvidence`, or use `srdGap` when that same
desired assertion currently fails. Identify the stable chapter/unit slug and
one aspect:

- `source`: the cached CC source contains the complete rule claim;
- `mechanic`: generated expression or offline behavior implements it;
- `fixture`: rendered package output carries it;
- `live`: a running world demonstrates it.

The semantic unit plan is authored from source reading; the reporter generates
its state, links, and counts. Every unit must cover all four axes. Use
`srdUnencoded` for known historical migration debt and `srdNotApplicable` with
a concrete reason only when a non-source axis genuinely does not apply. An
absent axis stays `⚠️ undeclared`; mixing N/A with evidence on one axis is a
lane failure.

```ts
srdGap(
	{
		chapter: "playing-the-game",
		unit: "example-rule",
		aspect: "mechanic",
		claim: "the generated mechanic implements the complete source rule",
		references: ["ledger/designs/example-rule.md"],
	},
	() => {
		expect(actualMechanic()).toEqual(sourceRequiredBehavior);
	},
);
```

Do not duplicate an assertion in a coverage-only test. References preserve
design and diagnosis, but they never determine status.

## Regenerate and verify

```bash
# Intentionally rewrite every generated evidence view.
pnpm --filter @spellkave/srd-cc run test:srd-coverage

# Regenerate into a temporary directory and reject stale, missing, or orphaned reports.
pnpm --filter @spellkave/srd-cc run test

pnpm --filter @spellkave/srd-cc run typecheck
```

The writer owns `ledger/<chapter>.md`, `ledger/findings.md`, and
`fixtures/coverage.md`; each file says it is generated. Commit the owning test
and regenerated views together. Decisions remain in the nearest design or
canonical spec and are linked from the declaration; archived prose is optional
history, never required operating state.

The runner selects tests throughout `src`, including documentation routing,
legacy export and flavour metadata assertions. Pipeline tests keep their
separate shard command and exclusion. The live fixture recorder under `scripts`
uses the explicit capture configuration and regeneration recipe.
