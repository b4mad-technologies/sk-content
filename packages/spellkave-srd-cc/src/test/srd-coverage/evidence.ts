import { it } from "vitest";

import {
	type BacklogItemIdentity,
	backlogName,
	evidenceName,
	type FindingEvidenceIdentity,
	findingName,
	notApplicableName,
	type SrdEvidenceIdentity,
	type SrdNotApplicableIdentity,
} from "./protocol";

/**
 * Register one executable SRD coverage claim. The test declaration is the
 * inventory: the generated ledger and coverage report discover this name from
 * Vitest's actual result tree rather than reading a parallel checklist.
 */
export function srdEvidence(
	evidence: SrdEvidenceIdentity,
	assertion: () => void | Promise<void>,
): void {
	it(evidenceName(evidence), assertion);
}

/**
 * Register a claim whose inputs stay outside sk-content (live tests, design
 * docs). It stays in the inventory as a skipped test.
 */
export function srdEvidenceHeld(
	evidence: SrdEvidenceIdentity,
	assertion: () => void | Promise<void>,
): void {
	it.skip(evidenceName(evidence), assertion);
}

/** Register an executable logical-RED claim without failing while the known gap remains. */
export function srdGap(evidence: SrdEvidenceIdentity, assertion: () => void | Promise<void>): void {
	it.fails(evidenceName(evidence), assertion);
}

/** Record historical migration debt whose desired assertion is not encoded yet. */
export function srdUnencoded(evidence: SrdEvidenceIdentity): void {
	it.todo(evidenceName(evidence));
}

export function srdNotApplicable(evidence: SrdNotApplicableIdentity): void {
	it.skip(notApplicableName(evidence), () => undefined);
}

export function findingEvidence(
	finding: FindingEvidenceIdentity,
	assertion: () => void | Promise<void>,
	timeout?: number,
): void {
	it(findingName(finding), assertion, timeout);
}

export function findingGap(
	finding: FindingEvidenceIdentity,
	assertion: () => void | Promise<void>,
	timeout?: number,
): void {
	it.fails(findingName(finding), assertion, timeout);
}

/**
 * Register one open backlog item as pure intent — no assertion exists yet
 * (a design round, a story milestone). Still discovered, counted, and
 * rendered by the reporter, exactly like `srdUnencoded`. Promote to
 * `backlogItemAssertable` the moment a concrete assertion can be written;
 * retire by deleting the declaration — the regenerated ledger then drops it.
 */
export function backlogItemDeclared(item: BacklogItemIdentity): void {
	it.todo(backlogName(item, "declared"));
}

/**
 * Register one open backlog item with a real assertion that FAILS today by
 * design (same `it.fails` discipline as `findingGap`). When the underlying
 * feature ships, the assertion starts passing and Vitest deliberately fails
 * the lane — that flip is the forcing function to retire this declaration
 * (delete it) rather than let the ledger silently drift from reality.
 */
export function backlogItemAssertable(
	item: BacklogItemIdentity,
	assertion: () => void | Promise<void>,
	timeout?: number,
): void {
	it.fails(backlogName(item, "assertable"), assertion, timeout);
}
