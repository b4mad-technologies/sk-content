#!/usr/bin/env tsx
/** Emit skgen prose-manifest for class-feature identity cards. No model call. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildChampionFeatureUnits,
	buildFighterFeatureUnits,
} from "../src/chapters/classes/fighter-units.ts";
import { buildRemainingClassFeatureGroups } from "../src/chapters/classes/remaining-classes-units.ts";
import { canonicalClassFeatureText } from "../src/text/class-feature-canonical.ts";

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(PKG_ROOT, "authored/flavor/en/class-features.prose-manifest.json");

const MUST_NOT = ["Forgotten Realms", "Greyhawk", "Eberron", "Source:", "pk='", "ClassFeatureItem"];

function featureSrdText(args: {
	sourcePk: string;
	entityId: string;
	displayName: string;
	className: string;
	subclassName?: string;
}): string {
	const parts = args.entityId.replace(/^srd\/class-feature\//, "").split("/");
	const featureSlug = parts.at(-1) ?? args.displayName;
	const parentPk = args.sourcePk.slice(0, args.sourcePk.length - featureSlug.length - 1);
	try {
		return canonicalClassFeatureText({
			sourcePk: args.sourcePk,
			parentPk,
			featureSlug,
			className: args.className,
			...(args.subclassName ? { subclassName: args.subclassName } : {}),
		}).text;
	} catch {
		return args.displayName;
	}
}

const fighter = buildFighterFeatureUnits().map((unit) => ({
	sourcePk: unit.sourcePk,
	entityId: unit.entityId,
	displayName: unit.displayName,
	className: "Fighter",
}));
const champion = buildChampionFeatureUnits().map((unit) => ({
	sourcePk: unit.sourcePk,
	entityId: unit.entityId,
	displayName: unit.displayName,
	className: "Champion",
	subclassName: "Champion",
}));
const remaining = buildRemainingClassFeatureGroups().flatMap((group) => [
	...group.classFeatures.map((unit) => ({
		sourcePk: unit.sourcePk,
		entityId: unit.entityId,
		displayName: unit.displayName,
		className: group.classDisplayName,
	})),
	...group.subclassFeatures.map((unit) => ({
		sourcePk: unit.sourcePk,
		entityId: unit.entityId,
		displayName: unit.displayName,
		className: group.subclassDisplayName,
		subclassName: group.subclassDisplayName,
	})),
]);

const units = [...fighter, ...champion, ...remaining];
const manifest = {
	schema: "spellkave-prose-manifest/v1",
	output_dir: "packages/spellkave-srd-cc/authored/flavor/.runs",
	entries: units.map((unit) => ({
		id: `class-feature/${unit.entityId.replace(/^srd\/class-feature\//, "")}`,
		display_name: unit.displayName,
		prompt_id: "flavor-resource",
		model: "openai/gpt-5.6-terra",
		core_traits: { srd_text: featureSrdText(unit) },
		must_include: [],
		must_not: MUST_NOT,
	})),
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(manifest, null, "\t")}\n`);
console.log(`wrote ${OUT_PATH} (${manifest.entries.length} entries)`);
