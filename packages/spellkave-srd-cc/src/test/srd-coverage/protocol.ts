export const SRD_EVIDENCE_PREFIX = "[srd:";
export type SrdEvidenceAspect = "source" | "mechanic" | "fixture" | "live";
export type SrdApplicableAspect = Exclude<SrdEvidenceAspect, "source">;
export type EvidenceState =
	| "proven"
	| "reproduced"
	| "unencoded"
	| "not-run"
	| "failed"
	| "not-applicable";

export interface SrdEvidenceIdentity {
	chapter: string;
	unit: string;
	aspect: SrdEvidenceAspect;
	claim: string;
	references?: readonly string[];
}

export interface SrdNotApplicableIdentity extends Omit<SrdEvidenceIdentity, "aspect" | "claim"> {
	aspect: SrdApplicableAspect;
	reason: string;
}

export interface SrdEvidenceResult extends SrdEvidenceIdentity {
	testFile: string;
	testLine?: number;
	state: EvidenceState;
}

export interface FindingEvidenceIdentity {
	id: string;
	title: string;
	expected: string;
	observed: string;
	impact: string;
	references: readonly [string, ...string[]];
}

export interface FindingEvidenceResult extends FindingEvidenceIdentity {
	testFile: string;
	testLine?: number;
	state: Exclude<EvidenceState, "not-applicable">;
}

function referencesSuffix(references: readonly string[] | undefined): string {
	return (references ?? [])
		.map((reference) => {
			if (reference.includes("]")) {
				throw new Error("Coverage references must not contain ']'.");
			}
			return ` [ref:${reference}]`;
		})
		.join("");
}

function parseReferences(value: string): { claim: string; references?: string[] } {
	const references: string[] = [];
	let claim = value;
	for (;;) {
		const match = claim.match(/\s\[ref:([^\]]+)\]$/);
		if (match === null || match[1] === undefined) break;
		references.unshift(match[1]);
		claim = claim.slice(0, match.index);
	}
	return { claim, ...(references.length > 0 ? { references } : {}) };
}

function assertMarkerSafe(value: string, label: string): void {
	if (value.includes("]")) throw new Error(`${label} must not contain ']'.`);
}

export function evidenceName(evidence: SrdEvidenceIdentity): string {
	assertMarkerSafe(evidence.chapter, "Coverage chapter");
	assertMarkerSafe(evidence.unit, "Coverage unit");
	return `[srd:${evidence.chapter}/${evidence.unit}][${evidence.aspect}] ${evidence.claim}${referencesSuffix(evidence.references)}`;
}

export function notApplicableName(evidence: SrdNotApplicableIdentity): string {
	assertMarkerSafe(evidence.chapter, "Coverage chapter");
	assertMarkerSafe(evidence.unit, "Coverage unit");
	return `[srd:${evidence.chapter}/${evidence.unit}][${evidence.aspect}][n/a] ${evidence.reason}${referencesSuffix(evidence.references)}`;
}

export function parseSrdEvidenceName(name: string): SrdEvidenceIdentity | undefined {
	const match = name.match(/^\[srd:([^/\]]+)\/([^\]]+)\]\[(source|mechanic|fixture|live)\] (.+)$/);
	if (!match) return undefined;
	const [, chapter, unit, aspect, rest] = match;
	if (!chapter || !unit || !aspect || !rest) return undefined;
	return { chapter, unit, aspect: aspect as SrdEvidenceAspect, ...parseReferences(rest) };
}

export function parseSrdNotApplicableName(name: string): SrdEvidenceIdentity | undefined {
	const match = name.match(/^\[srd:([^/\]]+)\/([^\]]+)\]\[(mechanic|fixture|live)\]\[n\/a\] (.+)$/);
	if (!match) return undefined;
	const [, chapter, unit, aspect, rest] = match;
	if (!chapter || !unit || !aspect || !rest) return undefined;
	return { chapter, unit, aspect: aspect as SrdEvidenceAspect, ...parseReferences(rest) };
}

export type BacklogItemKind = "declared" | "assertable";

export interface BacklogItemIdentity {
	id: string;
	title: string;
	/** What-done-looks-like — the public behavior that closes this item. */
	expected: string;
	/** Background/why-now: decision-log topic ids, ADR numbers, commit SHAs. */
	context: string;
	references: readonly [string, ...string[]];
}

export interface BacklogItemResult extends BacklogItemIdentity {
	kind: BacklogItemKind;
	testFile: string;
	testLine?: number;
	state: Exclude<EvidenceState, "not-applicable">;
}

export function backlogName(item: BacklogItemIdentity, kind: BacklogItemKind): string {
	assertMarkerSafe(item.id, "Backlog id");
	for (const [label, value] of [
		["Backlog title", item.title],
		["Backlog expected behavior", item.expected],
		["Backlog context", item.context],
	] as const) {
		if (value.includes(" :: ")) throw new Error(`${label} must not contain ' :: '.`);
	}
	if (item.references.length === 0) throw new Error("Backlog references must not be empty.");
	return `[backlog:${item.id}][${kind}] ${item.title} :: expected: ${item.expected} :: context: ${item.context}${referencesSuffix(item.references)}`;
}

export function parseBacklogName(
	name: string,
): (BacklogItemIdentity & { kind: BacklogItemKind }) | undefined {
	const match = name.match(/^\[backlog:([^\]]+)\]\[(declared|assertable)\] (.+?) :: (.+)$/);
	if (!match) return undefined;
	const [, id, kind, title, rest] = match;
	if (!id || !kind || !title || !rest) return undefined;
	const parsed = parseReferences(rest);
	const fields = parsed.claim.match(/^expected: (.+) :: context: (.+)$/);
	if (!fields || !fields[1] || !fields[2] || !parsed.references?.[0]) return undefined;
	return {
		id,
		kind: kind as BacklogItemKind,
		title,
		expected: fields[1],
		context: fields[2],
		references: parsed.references as [string, ...string[]],
	};
}

export function findingName(finding: FindingEvidenceIdentity): string {
	assertMarkerSafe(finding.id, "Finding id");
	for (const [label, value] of [
		["Finding title", finding.title],
		["Finding expected behavior", finding.expected],
		["Finding observed behavior", finding.observed],
		["Finding impact", finding.impact],
	] as const) {
		if (value.includes(" :: ")) throw new Error(`${label} must not contain ' :: '.`);
	}
	if (finding.references.length === 0) throw new Error("Finding references must not be empty.");
	return `[finding:${finding.id}] ${finding.title} :: expected: ${finding.expected} :: observed: ${finding.observed} :: impact: ${finding.impact}${referencesSuffix(finding.references)}`;
}

export function parseFindingName(name: string): FindingEvidenceIdentity | undefined {
	const match = name.match(/^\[finding:([^\]]+)\] (.+?) :: (.+)$/);
	if (!match) return undefined;
	const [, id, title, rest] = match;
	if (!id || !title || !rest) return undefined;
	const parsed = parseReferences(rest);
	const fields = parsed.claim.match(/^expected: (.+) :: observed: (.+) :: impact: (.+)$/);
	if (!fields || !fields[1] || !fields[2] || !fields[3] || !parsed.references?.[0])
		return undefined;
	return {
		id,
		title,
		expected: fields[1],
		observed: fields[2],
		impact: fields[3],
		references: parsed.references as [string, ...string[]],
	};
}
