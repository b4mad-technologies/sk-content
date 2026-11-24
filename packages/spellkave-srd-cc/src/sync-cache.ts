// Copies the exact source-fork files this package depends on into the
// committed `cache/` directory, so generators/tests/CI read `cache/` only —
// never the forks directly. Fork paths come ONLY from `src/sources.ts`
// (license boundary) — never re-derived here.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OPEN5E_CORE_DIR, OPEN5E_SRD_2024_DIR, SRD_MARKDOWN_DIR } from "./sources.js";

const pkgRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cacheRoot = path.join(pkgRoot, "cache");

// Full-coverage sync (2026-07-28, operator decision): every SRD content file
// of both forks is cached up front, so no chapter ever has to discover its
// source is missing mid-design again (the rules-glossary/Influence-DC trap,
// `ledger/designs/generic-skill-check-target-dc.md`). The lists stay EXPLICIT
// filename enumerations — never a runtime glob — so a future fork addition
// cannot silently cross the license boundary without a reviewed edit here.

// All 34 normalized Django-fixture files of the CC-BY srd-2024 directory
// (the fork's sibling publisher dirs remain out of bounds via sources.ts).
const OPEN5E_FILES = [
	"AbilityDescription.json",
	"AlignmentDescription.json",
	"Armor.json",
	"Background.json",
	"BackgroundBenefit.json",
	"CharacterClass.json",
	"ClassFeature.json",
	"ClassFeatureItem.json",
	"ConditionDescription.json",
	"Creature.json",
	"CreatureAction.json",
	"CreatureActionAttack.json",
	"CreatureTrait.json",
	"CreatureTypeDescription.json",
	"CrossReference.json",
	"DamageTypeDescription.json",
	"Document.json",
	"Feat.json",
	"FeatBenefit.json",
	"Item.json",
	"ItemCategory.json",
	"MagicItem.json",
	"Rule.json",
	"RuleSet.json",
	"Service.json",
	"Services.json",
	"SkillDescription.json",
	"Species.json",
	"SpeciesTrait.json",
	"Spell.json",
	"SpellCastingOption.json",
	"Weapon.json",
	"WeaponProperty.json",
	"WeaponPropertyAssignment.json",
];

// `open5e/core` (a SECOND, sibling directory of the SAME open5e-api fork —
// `sources.ts`'s `OPEN5E_CORE_DIR`): its `Document.json` declares
// `licenses: ["cc-by-40", "ogl-10a"]` (verified 2026-07-31; historical detail
// in `ledger/archive/general-decisions.md`), but the widening is consumer-gated per file, never
// blanket — this list stays deliberately ONE entry until a second file names
// its own consumer. `Language.json`'s consumer: the Character Creation
// chapter's Languages unit (C2, `ledger/character-creation.md`).
const OPEN5E_CORE_FILES = ["Language.json"];

// All SRD 5.2.1 chapter files of the markdown fork. README/CHANGELOG/
// CONTRIBUTING are repo meta, not SRD content — deliberately excluded.
const MARKDOWN_FILES = [
	"animals.md",
	"character-creation.md",
	"character-origins.md",
	"classes.md",
	"equipment.md",
	"feats.md",
	"gameplay-toolbox.md",
	"magic-items.md",
	"monsters-A-Z.md",
	"monsters.md",
	"playing-the-game.md",
	"rules-glossary.md",
	"spells.md",
];

const SYNCED_FILES: Array<{
	fork: "open5e" | "markdown";
	sourceDir: string;
	fileName: string;
	cacheRelPath: string;
}> = [
	...OPEN5E_FILES.map((fileName) => ({
		fork: "open5e" as const,
		sourceDir: OPEN5E_SRD_2024_DIR,
		fileName,
		cacheRelPath: `open5e/${fileName}`,
	})),
	// Same upstream repo/commit as the srd-2024 rows above (`fork: "open5e"`),
	// a DIFFERENT source directory (`OPEN5E_CORE_DIR`) — see that constant's
	// module header for the license grounding. Sibling cache directory
	// (`cache/open5e-core/`), never mixed into `cache/open5e/`: the explicit
	// list above (not this join) is the license-review point.
	...OPEN5E_CORE_FILES.map((fileName) => ({
		fork: "open5e" as const,
		sourceDir: OPEN5E_CORE_DIR,
		fileName,
		cacheRelPath: `open5e-core/${fileName}`,
	})),
	...MARKDOWN_FILES.map((fileName) => ({
		fork: "markdown" as const,
		sourceDir: SRD_MARKDOWN_DIR,
		fileName,
		cacheRelPath: `markdown/${fileName}`,
	})),
];

const FORKS: Record<"open5e" | "markdown", { dir: string; name: string; upstream: string }> = {
	open5e: {
		dir: path.resolve(OPEN5E_SRD_2024_DIR, "../../../.."), // repo root of the open5e-api fork
		name: "durandom/open5e-api",
		upstream: "https://github.com/open5e/open5e-api",
	},
	markdown: {
		dir: SRD_MARKDOWN_DIR,
		name: "durandom/dnd-5e-srd-markdown",
		upstream: "https://github.com/downfallx/dnd-5e-srd-markdown",
	},
};

function sha256(filePath: string): string {
	return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function gitInfo(forkDir: string): { sha: string; date: string } {
	const sha = execFileSync("git", ["-C", forkDir, "rev-parse", "HEAD"], {
		encoding: "utf8",
	}).trim();
	const date = execFileSync("git", ["-C", forkDir, "log", "-1", "--format=%cI"], {
		encoding: "utf8",
	}).trim();
	return { sha, date };
}

function syncFiles(): void {
	for (const entry of SYNCED_FILES) {
		const src = path.join(entry.sourceDir, entry.fileName);
		const dest = path.join(cacheRoot, entry.cacheRelPath);
		mkdirSync(path.dirname(dest), { recursive: true });
		copyFileSync(src, dest);
	}
}

function writeProvenance(): void {
	const forkOrder = ["markdown", "open5e"] as const;
	const upstream: Record<string, unknown> = {};
	for (const fork of forkOrder) {
		const { dir, name, upstream: upstreamUrl } = FORKS[fork];
		const { sha, date } = gitInfo(dir);
		const files = SYNCED_FILES.filter((entry) => entry.fork === fork)
			.map((entry) => ({
				path: entry.cacheRelPath,
				sha256: sha256(path.join(cacheRoot, entry.cacheRelPath)),
			}))
			.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
		upstream[fork] = {
			name,
			upstream: upstreamUrl,
			commit: sha,
			commitDate: date,
			files,
		};
	}
	const provenance = {
		forks: upstream,
	};
	mkdirSync(cacheRoot, { recursive: true });
	writeFileSync(
		path.join(cacheRoot, "UPSTREAM.json"),
		`${JSON.stringify(provenance, null, "\t")}\n`,
	);
}


function main(): void {
	syncFiles();
	writeProvenance();
}

main();
