// pattern: none — composite local AuthorTarget over core, srd and dm fixtures
/**
 * Expose the seeded dm action, capability and niche definitions needed by the
 * adventure's prompt references and fixed wizard placements. The SRD fixture
 * root is the base target; core supplies frontier capabilities and dm's
 * standalone manifest supplies its named kinds.
 * Its dependency points to srd, whose manifest lives at the fixture root rather
 * than a srd subdirectory, so it cannot be loaded as an independent bundle chain.
 * Action reference-closure augmentation remains narrowed by the authoring verbs.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	AuthorTarget,
	AuthorTargetLookupFilter,
	ManifestRow,
} from "@spellkave/tool-authoring";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { inspectManifest } from "@spellkave/world-author";

/** Row kind → its natural-key id field, for the named `dm`-sourced kinds this wrapper exposes. */
const DM_SOURCED_ID_FIELDS: Readonly<Record<string, string>> = {
	action_definitions: "action_id",
	condition_definitions: "condition_definition_id",
	capability_definitions: "capability_id",
	niche_definitions: "niche_id",
	resource_definitions: "resource_definition_id",
	object_state_definitions: "state_id",
	metadata_namespaces: "namespace",
};

function dmRows(fixturesDir: string, rowKind: string): ManifestRow[] {
	const manifestPath = join(fixturesDir, "dm", "manifest.toml");
	const manifest = inspectManifest(readFileSync(manifestPath, "utf8")).manifest as Record<
		string,
		unknown
	>;
	return Array.isArray(manifest[rowKind]) ? (manifest[rowKind] as ManifestRow[]) : [];
}

export function elvenMiniAuthorTarget(fixturesDir: string): AuthorTarget {
	const srdTarget = createLocalAuthorTarget(fixturesDir);
	const corePath = process.env.SPELLKAVE_CORE_FIXTURES;
	if (!corePath || !existsSync(join(corePath, "manifest.toml"))) {
		throw new Error("Set SPELLKAVE_CORE_FIXTURES to sk-grimoire's mechanics core fixture directory.");
	}
	const coreTarget = createLocalAuthorTarget(corePath);
	const dmCache = new Map<string, ManifestRow[]>();
	const dmRowsFor = (rowKind: string): ManifestRow[] => {
		let rows = dmCache.get(rowKind);
		if (rows === undefined) {
			rows = dmRows(fixturesDir, rowKind);
			dmCache.set(rowKind, rows);
		}
		return rows;
	};
	return {
		kind: srdTarget.kind,
		resolveRef(rowKind, id) {
			const idField = DM_SOURCED_ID_FIELDS[rowKind];
			if (idField !== undefined && dmRowsFor(rowKind).some((row) => row[idField] === id)) {
				return true;
			}
			return srdTarget.resolveRef(rowKind, id) || coreTarget.resolveRef(rowKind, id);
		},
		lookup(rowKind, filter?: AuthorTargetLookupFilter) {
			if (!(rowKind in DM_SOURCED_ID_FIELDS))
				return [...srdTarget.lookup(rowKind, filter), ...coreTarget.lookup(rowKind, filter)];
			const rows = [
				...srdTarget.lookup(rowKind, filter),
				...coreTarget.lookup(rowKind, filter),
				...dmRowsFor(rowKind),
			];
			return filter?.bundle === undefined
				? rows
				: rows.filter((row) => row.bundle_id === filter.bundle);
		},
		applyBatch(toml) {
			return srdTarget.applyBatch(toml);
		},
	};
}
