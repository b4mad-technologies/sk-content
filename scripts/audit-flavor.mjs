// Deterministic spot check of the SRD flavor blurbs.
//
// Usage: node scripts/audit-flavor.mjs [flavor-dir] [--json out.json]
//
// Flags a blurb when it
//   1. shares a run of N or more words with the SRD source cache
//      (Markdown transcription and Open5e JSON),
//   2. shares a run of N or more words with another blurb,
//   3. contains a sentence repeated in many blurbs (boilerplate),
//   4. names non-SRD product identity, or
//   5. contains model refusals or generation artefacts.
// It also reports the frontmatter model split.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srd = join(root, "packages/spellkave-srd-cc");
const args = process.argv.slice(2);
const jsonAt = args.indexOf("--json");
const jsonOut = jsonAt >= 0 ? args[jsonAt + 1] : undefined;
const positional = args.filter((arg, index) => !arg.startsWith("--") && index !== jsonAt + 1);
const flavorDir = resolve(positional[0] ?? join(srd, "authored/flavor/en"));

const RUN = 12; // words; long enough to skip stock phrases like "at the start of your turn"
const BOILERPLATE_FILES = 5; // a sentence of 8+ words in this many blurbs
const PRODUCT_IDENTITY = [
	"beholder", "mind flayer", "illithid", "githyanki", "githzerai", "yuan-ti", "kuo-toa",
	"slaad", "carrion crawler", "umber hulk", "displacer beast", "intellect devourer",
	"faerûn", "faerun", "forgotten realms", "waterdeep", "baldur's gate", "neverwinter",
	"greyhawk", "eberron", "ravenloft", "barovia", "strahd", "planescape",
	"spelljammer", "dragonlance", "krynn", "mordenkainen", "tasha", "xanathar", "volo",
	"elminster", "drizzt", "bigby", "tenser", "otiluke", "melf", "leomund", "rary",
	"nystul", "drawmij", "evard", "otto", "vecna", "lolth", "tiamat", "bahamut", "asmodeus",
	"dungeons & dragons", "dungeons and dragons", "d&d", "wizards of the coast",
	"player's handbook", "monster manual", "dungeon master's guide",
];
// Planescape's city; the plain noun "sigil" is common, so match it capitalised mid-sentence.
const CASED_IDENTITY = [/[a-z,;] Sigil\b/];
const ARTEFACTS = [
	/\bas an ai\b/i, /\blanguage model\b/i, /\bi can(?:no|')t\b/i, /\bi'm sorry\b/i,
	/\bi apologi[sz]e\b/i, /^\s*(?:sure|certainly|here is|here's)\b/im, /```/, /<\|/,
	/\[insert/i, /\btodo\b/i, /lorem ipsum/i, /\bflavor text\b/i, /\bblurb\b/i,
	/^#{1,6}\s/m, /\{\{|\}\}/, /\bprompt\b/i, /\bword count\b/i,
];

function walk(dir, filter) {
	const out = [];
	for (const name of readdirSync(dir).sort()) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...walk(path, filter));
		else if (filter(name)) out.push(path);
	}
	return out;
}

function words(text) {
	return text.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) ?? [];
}

function shingles(list) {
	const out = [];
	for (let i = 0; i + RUN <= list.length; i += 1) out.push(list.slice(i, i + RUN).join(" "));
	return out;
}

function jsonStrings(value, out) {
	if (typeof value === "string") out.push(value);
	else if (Array.isArray(value)) for (const item of value) jsonStrings(item, out);
	else if (value && typeof value === "object") for (const item of Object.values(value)) jsonStrings(item, out);
	return out;
}

function parseBlurb(path) {
	const text = readFileSync(path, "utf8");
	const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
	if (!match) return { meta: {}, body: text };
	const meta = Object.fromEntries(
		match[1].split("\n").map((line) => {
			const at = line.indexOf(":");
			return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
		}),
	);
	return { meta, body: match[2] };
}

// 1. SRD source shingles.
const srdShingles = new Set();
for (const path of walk(join(srd, "cache"), (name) => /\.(md|json)$/.test(name))) {
	const text = readFileSync(path, "utf8");
	const parts = path.endsWith(".json") ? jsonStrings(JSON.parse(text), []) : [text];
	for (const part of parts) for (const shingle of shingles(words(part))) srdShingles.add(shingle);
}

const files = walk(flavorDir, (name) => name.endsWith(".md") && name !== "README.md");
const blurbs = files.map((path) => ({ path: relative(flavorDir, path), ...parseBlurb(path) }));

const models = new Map();
for (const { meta } of blurbs) {
	const key = `${meta.model ?? meta.author ?? "(none)"} | reviewed=${meta.reviewed ?? "(none)"}`;
	models.set(key, (models.get(key) ?? 0) + 1);
}

const shingleFiles = new Map();
const sentenceFiles = new Map();
for (const blurb of blurbs) {
	const list = words(blurb.body);
	blurb.words = list.length;
	blurb.srdRun = 0;
	let run = 0;
	for (const shingle of shingles(list)) {
		run = srdShingles.has(shingle) ? run + 1 : 0;
		blurb.srdRun = Math.max(blurb.srdRun, run === 0 ? 0 : run + RUN - 1);
	}
	for (const shingle of new Set(shingles(list))) {
		if (!shingleFiles.has(shingle)) shingleFiles.set(shingle, new Set());
		shingleFiles.get(shingle).add(blurb.path);
	}
	for (const sentence of blurb.body.split(/(?<=[.!?])\s+/)) {
		const key = words(sentence).join(" ");
		if (key.split(" ").length < 8) continue;
		if (!sentenceFiles.has(key)) sentenceFiles.set(key, new Set());
		sentenceFiles.get(key).add(blurb.path);
	}
}

const flags = new Map();
function flag(path, reason) {
	if (!flags.has(path)) flags.set(path, []);
	if (!flags.get(path).includes(reason)) flags.get(path).push(reason);
}
for (const blurb of blurbs) {
	if (blurb.srdRun > 0) flag(blurb.path, `srd-overlap:${blurb.srdRun}w`);
	const lower = blurb.body.toLowerCase().replace(/[’‘]/g, "'");
	for (const term of PRODUCT_IDENTITY) {
		const pattern = new RegExp(`(^|[^a-z])${term.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")}($|[^a-z])`);
		if (pattern.test(lower)) flag(blurb.path, `product-identity:${term}`);
	}
	for (const pattern of CASED_IDENTITY) if (pattern.test(blurb.body)) flag(blurb.path, "product-identity:Sigil");
	for (const pattern of ARTEFACTS) if (pattern.test(blurb.body)) flag(blurb.path, `artefact:${pattern.source}`);
	if (blurb.words < 8) flag(blurb.path, `short:${blurb.words}w`);
	// A blurb that repeats one of its own 6-word runs usually is a generation stutter.
	const seen = new Set();
	const list = words(blurb.body);
	for (let i = 0; i + 6 <= list.length; i += 1) {
		const run = list.slice(i, i + 6).join(" ");
		if (seen.has(run)) {
			flag(blurb.path, "self-repeat");
			break;
		}
		seen.add(run);
	}
}
for (const [shingle, set] of shingleFiles) {
	if (set.size < 2) continue;
	for (const path of set) flag(path, `cross-file:${set.size}`);
}
for (const [sentence, set] of sentenceFiles) {
	if (set.size < BOILERPLATE_FILES) continue;
	for (const path of set) flag(path, `boilerplate:${set.size}`);
}

const byReason = new Map();
for (const reasons of flags.values()) {
	for (const reason of reasons) {
		const key = reason.replace(/:\d+w?$/, "");
		byReason.set(key, (byReason.get(key) ?? 0) + 1);
	}
}

console.log(`blurbs: ${blurbs.length}`);
console.log("model split:");
for (const [key, count] of [...models].sort((a, b) => b[1] - a[1])) console.log(`  ${count}\t${key}`);
console.log(`flagged files: ${flags.size}`);
for (const [key, count] of [...byReason].sort((a, b) => b[1] - a[1])) console.log(`  ${count}\t${key}`);
// Seeded sample for the manual read (mulberry32, fixed seed).
const SAMPLE = 150;
let seed = 0x5eed41;
function random() {
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pool = blurbs.map((blurb) => blurb.path);
for (let i = pool.length - 1; i > 0; i -= 1) {
	const j = Math.floor(random() * (i + 1));
	[pool[i], pool[j]] = [pool[j], pool[i]];
}
const sample = pool.slice(0, SAMPLE).sort();

if (jsonOut) {
	writeFileSync(
		jsonOut,
		`${JSON.stringify(
			{
				run_words: RUN,
				sample,
				blurbs: blurbs.length,
				models: Object.fromEntries(models),
				flagged: Object.fromEntries([...flags].sort()),
				shared_runs: [...shingleFiles]
					.filter(([, set]) => set.size >= 2)
					.map(([shingle, set]) => ({ shingle, files: [...set].sort() })),
				boilerplate: [...sentenceFiles]
					.filter(([, set]) => set.size >= BOILERPLATE_FILES)
					.map(([sentence, set]) => ({ sentence, files: set.size })),
			},
			null,
			2,
		)}\n`,
	);
}
