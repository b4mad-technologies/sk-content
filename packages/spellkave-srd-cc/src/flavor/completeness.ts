/** Fixture id → authored flavor path. Identity leftovers are named exemptions. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { FLAVOR_ROOT, ruleFlavorSlug } from "./read";

export type FlavorRowKind =
	| "entity_definitions"
	| "resource_definitions"
	| "capability_definitions"
	| "condition_definitions"
	| "action_definitions"
	| "tag_value_definitions"
	| "niche_definitions"
	| "dsl_macro_definitions"
	| "session_definitions"
	| "consequence_templates";

export interface FlavorRow {
	kind: FlavorRowKind;
	id: string;
}

/** Prefixes that must have `authored/flavor/en/.../<slug>.md`. */
const REQUIRED_ENTITY_PREFIXES = [
	"srd/class/",
	"srd/subclass/",
	"srd/creature/",
	"srd/spell/",
	"srd/magic_item/",
	"srd/feat/",
	"srd/item/",
	"srd/armor/",
	"srd/tool/",
	"srd/species/",
	"srd/background/",
	"srd/class-feature/",
	"srd/weapon/",
	"srd/natural-weapon/",
	"srd/trait/",
	"srd/eldritch-invocation/",
	"srd/metamagic/",
	"srd/expertise-option/",
	"srd/divine-order/",
	"srd/primal-order/",
	"srd/skill-option/",
	"srd/advancement-choice-option/",
	"srd/pregen/",
] as const;

/** No flavor file yet. Empty when every catalog/rule id has authored markdown. */
export const FLAVOR_EXEMPTIONS: Record<string, string> = {
	"srd/catalogue/": "cited table row, not a Meaning card",
	"srd/service/": "cited service sentence, not a Meaning card",
	"srd/trinket/": "cited trinket cell, not a Meaning card",
};

const IDENTITY_RESOURCE_IDS = new Set<string>([]);

function dashAfter(id: string, prefix: string): string {
	return id.slice(prefix.length).replaceAll("/", "-");
}

function entityRelPath(id: string): string | null {
	if (id.startsWith("srd/class-feature/")) {
		return `class-features/${dashAfter(id, "srd/class-feature/")}.md`;
	}
	const map: Array<[string, string]> = [
		["srd/class/", "classes"],
		["srd/subclass/", "subclasses"],
		["srd/creature/", "monsters"],
		["srd/spell/", "spells"],
		["srd/magic_item/", "items"],
		["srd/feat/", "feats"],
		["srd/item/", "gear"],
		["srd/armor/", "armor"],
		["srd/tool/", "tools"],
		["srd/species/", "species"],
		["srd/background/", "backgrounds"],
		["srd/weapon/", "weapons"],
		["srd/natural-weapon/", "natural-weapons"],
		["srd/trait/", "traits"],
		["srd/eldritch-invocation/", "eldritch-invocations"],
		["srd/metamagic/", "metamagic"],
		["srd/expertise-option/", "expertise-options"],
		["srd/divine-order/", "divine-order"],
		["srd/primal-order/", "primal-order"],
		["srd/skill-option/", "skill-options"],
		["srd/advancement-choice-option/", "advancement-choice-options"],
		["srd/pregen/", "pregen"],
	];
	for (const [prefix, dir] of map) {
		if (id.startsWith(prefix)) return `${dir}/${dashAfter(id, prefix)}.md`;
	}
	return null;
}

export function flavorExemptionReason(row: FlavorRow): string | null {
	if (row.kind === "entity_definitions") {
		for (const [prefix, reason] of Object.entries(FLAVOR_EXEMPTIONS)) {
			if (row.id.startsWith(prefix)) return reason;
		}
		return null;
	}
	if (row.kind === "resource_definitions") {
		return IDENTITY_RESOURCE_IDS.has(row.id) ? "scratch cell, not a Meaning card" : null;
	}
	return null;
}

/** Relative path under authored/flavor/en/, or null when this row is identity-exempt. */
export function flavorRelPath(row: FlavorRow): string | null {
	if (flavorExemptionReason(row) !== null) return null;
	if (row.kind === "entity_definitions") {
		if (!REQUIRED_ENTITY_PREFIXES.some((prefix) => row.id.startsWith(prefix))) {
			return null;
		}
		return entityRelPath(row.id);
	}
	if (row.kind === "resource_definitions") {
		return `resources/${ruleFlavorSlug(row.id)}.md`;
	}
	if (row.kind === "capability_definitions") {
		return `capabilities/${ruleFlavorSlug(row.id)}.md`;
	}
	if (row.kind === "condition_definitions") {
		return `conditions/${ruleFlavorSlug(row.id)}.md`;
	}
	if (row.kind === "tag_value_definitions") {
		return `tags/${row.id.replaceAll(".", "-")}.md`;
	}
	if (row.kind === "niche_definitions") {
		return `niches/${row.id.replaceAll(":", "-").replaceAll("/", "-")}.md`;
	}
	if (row.kind === "dsl_macro_definitions") {
		return `macros/${ruleFlavorSlug(row.id)}.md`;
	}
	if (row.kind === "session_definitions") {
		return `sessions/${ruleFlavorSlug(row.id)}.md`;
	}
	if (row.kind === "consequence_templates") {
		return `consequences/${ruleFlavorSlug(row.id)}.md`;
	}
	return `actions/${ruleFlavorSlug(row.id)}.md`;
}

export function flavorAbsPath(row: FlavorRow, locale = "en"): string | null {
	const rel = flavorRelPath(row);
	if (rel === null) return null;
	return join(FLAVOR_ROOT, locale, rel);
}

export function flavorFileExists(row: FlavorRow, locale = "en"): boolean {
	const path = flavorAbsPath(row, locale);
	return path !== null && existsSync(path);
}

export function unmappedPrefix(row: FlavorRow): string | null {
	if (flavorExemptionReason(row) !== null) return null;
	if (flavorRelPath(row) !== null) return null;
	const parts = row.id.split("/");
	return parts.length >= 2 ? `${parts[0]}/${parts[1]}/` : `${row.id}/`;
}
