// Completeness: every production affordance_template in the seeded root
// bundle whose authored capability_id is srd/action/attack carries exactly
// one SRD-owned ui.affordance_group {group:combat} attachment. Grounded in
// the capability column from the canonical manifest loader, not a path/name
// heuristic or a parallel TOML parser.
import { inspectManifest, loadFlattened } from "@spellkave/world-author";
import { describe, expect, it } from "vitest";
import { FIXTURES_DIR } from "../../pipeline";
import {
	AFFORDANCE_COMBAT_GROUP,
	AFFORDANCE_GROUP_NAMESPACE,
	attackCapabilityCombatTemplateIds,
} from "../../ui/affordance-groups";

const ATTACK_CAPABILITY_ID = "srd/action/attack";
const SRD_BUNDLE_ID = "srd";

type Manifest = Record<string, unknown>;

function asRows(manifest: Manifest, kind: string): Record<string, unknown>[] {
	const value = manifest[kind];
	return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function parseCombatGroupPayload(payloadJson: unknown): string | undefined {
	if (typeof payloadJson !== "string") return undefined;
	let parsed: unknown;
	try {
		parsed = JSON.parse(payloadJson);
	} catch {
		return undefined;
	}
	if (typeof parsed !== "object" || parsed === null) return undefined;
	const record = parsed as Record<string, unknown>;
	if (Object.keys(record).length !== 1) return undefined;
	const group = record.group;
	return typeof group === "string" && group.length > 0 ? group : undefined;
}

function attackCapabilityCombatMembershipReport(manifest: Manifest): {
	attackTemplateIds: string[];
	errors: string[];
} {
	const attackTemplateIds = asRows(manifest, "affordance_templates")
		.filter((row) => row.capability_id === ATTACK_CAPABILITY_ID)
		.map((row) => String(row.template_id ?? ""))
		.filter((id) => id.length > 0)
		.sort();

	const attachments = asRows(manifest, "metadata_attachments").filter(
		(row) =>
			row.namespace === AFFORDANCE_GROUP_NAMESPACE && row.target_kind === "affordance_template",
	);

	const errors: string[] = [];
	const counts = new Map<string, number>();
	for (const row of attachments) {
		const ref = String(row.target_ref ?? "");
		counts.set(ref, (counts.get(ref) ?? 0) + 1);
		if (row.bundle_id !== SRD_BUNDLE_ID) {
			errors.push(`ownership: ${ref} bundle_id=${String(row.bundle_id)}`);
		}
		if (parseCombatGroupPayload(row.payload_json) !== AFFORDANCE_COMBAT_GROUP) {
			errors.push(`payload: ${ref}`);
		}
	}
	for (const [ref, count] of counts) {
		if (count !== 1) errors.push(`duplicate: ${ref} x${count}`);
	}
	for (const id of attackTemplateIds) {
		if (!counts.has(id)) errors.push(`missing: ${id}`);
	}
	for (const ref of counts.keys()) {
		if (!attackTemplateIds.includes(ref)) errors.push(`extra: ${ref}`);
	}

	const namespaces = asRows(manifest, "metadata_namespaces").filter(
		(row) => row.namespace === AFFORDANCE_GROUP_NAMESPACE,
	);
	if (namespaces.length !== 1) {
		errors.push(`namespace-count: ${namespaces.length}`);
	} else {
		const row = namespaces[0];
		if (row?.bundle_id !== SRD_BUNDLE_ID) errors.push("namespace-owner");
		if (row?.audience !== "public") errors.push("namespace-audience");
	}

	return { attackTemplateIds, errors: errors.sort() };
}

function cloneManifest(manifest: Manifest): Manifest {
	return structuredClone(manifest);
}

describe("ui.affordance_group Attack-capability membership", () => {
	const flattened = loadFlattened(FIXTURES_DIR);
	const committed = inspectManifest(flattened).manifest as Manifest;
	const committedReport = attackCapabilityCombatMembershipReport(committed);
	const generatorIds = [...attackCapabilityCombatTemplateIds()].sort();

	it("generator identities equal every seeded srd/action/attack affordance_template", () => {
		expect(committedReport.attackTemplateIds.length).toBeGreaterThan(0);
		expect(generatorIds).toEqual(committedReport.attackTemplateIds);
	});

	it("SRD owns exactly one valid combat payload per Attack-capability template", () => {
		expect(committedReport.errors).toEqual([]);
		expect(committedReport.attackTemplateIds).toEqual(generatorIds);
	});

	it("missing membership is a completeness failure", () => {
		const mutated = cloneManifest(committed);
		const dropped = generatorIds[0];
		mutated.metadata_attachments = asRows(mutated, "metadata_attachments").filter(
			(row) =>
				!(
					row.namespace === AFFORDANCE_GROUP_NAMESPACE &&
					row.target_kind === "affordance_template" &&
					row.target_ref === dropped
				),
		);
		expect(attackCapabilityCombatMembershipReport(mutated).errors).toContain(`missing: ${dropped}`);
	});

	it("duplicate target_ref is a completeness failure", () => {
		const mutated = cloneManifest(committed);
		const original = asRows(mutated, "metadata_attachments").find(
			(row) =>
				row.namespace === AFFORDANCE_GROUP_NAMESPACE &&
				row.target_kind === "affordance_template" &&
				row.target_ref === generatorIds[0],
		);
		expect(original).toBeDefined();
		asRows(mutated, "metadata_attachments").push({ ...original });
		expect(attackCapabilityCombatMembershipReport(mutated).errors).toContain(
			`duplicate: ${generatorIds[0]} x2`,
		);
	});

	it("malformed payload is a completeness failure", () => {
		const mutated = cloneManifest(committed);
		const row = asRows(mutated, "metadata_attachments").find(
			(candidate) =>
				candidate.namespace === AFFORDANCE_GROUP_NAMESPACE &&
				candidate.target_kind === "affordance_template" &&
				candidate.target_ref === generatorIds[0],
		);
		expect(row).toBeDefined();
		if (row !== undefined) row.payload_json = '{"group":"combat","extra":true}';
		expect(attackCapabilityCombatMembershipReport(mutated).errors).toContain(
			`payload: ${generatorIds[0]}`,
		);
	});
});
