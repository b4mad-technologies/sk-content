/**
 * Build the inputs for the Kavemouth backdrop images: one plan picture
 * and one PixelLab request (blueprint) per place.
 *
 * The plan picture is the place's floor plan from `author/lib/layouts.ts`
 * painted in flat colours: rooms as floor, the connections between rooms
 * as passages, everything else as ground. The image model receives it as
 * its starting image, so the finished backdrop keeps our room layout.
 *
 *   tsx scripts/build-map-inputs.ts            write plans and blueprints
 *   tsx scripts/build-map-inputs.ts --check    fail when they are stale
 *
 * Deterministic: no clock, no randomness, no network.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { PLAN_CELL_PX, PLANS, type PlanKey } from "../author/lib/layouts.ts";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..");
const MAPS_DIR = join(PACKAGE_ROOT, "assets", "kavemouth-maps");
const PLAN_DIR = join(MAPS_DIR, "plans");
const BLUEPRINT_DIR = join(PACKAGE_ROOT, "art", "maps");

type Rgb = readonly [number, number, number];

/** Flat colours of the plan picture, by surface. */
const SURFACE = {
	rock: [38, 36, 42],
	earth: [58, 48, 40],
	grass: [86, 112, 62],
	marsh: [62, 86, 72],
	road: [150, 128, 92],
	wood: [146, 108, 68],
	stone: [128, 124, 122],
	cave: [104, 92, 80],
	water: [64, 110, 128],
	slime: [104, 140, 70],
	yard: [132, 122, 88],
	canvas: [170, 150, 112],
	plank: [120, 88, 56],
	green: [112, 144, 78],
	wall: [24, 22, 26],
} as const satisfies Record<string, Rgb>;

type Surface = keyof typeof SURFACE;

type Style = {
	/** What the model is asked to paint. */
	subject: string;
	ground: Surface;
	floor: Surface;
	passage: Surface;
	/** Rooms whose floor differs from the place's default. */
	rooms?: Record<string, Surface>;
	/** Scenery painted on the ground before any room: `[x, y, w, h]` in cells. */
	scenery?: ReadonlyArray<{ rect: readonly [number, number, number, number]; surface: Surface }>;
	/** How firmly the image model must keep the plan (PixelLab init image strength). */
	strength?: number;
	/** Generation seed; changed when a run came back with stray lettering or figures. */
	seed?: number;
};

const TOP_DOWN =
	"Top-down pixel art game map seen from straight above, one continuous scene, " +
	"muted earthy palette, soft shading, readable floors and walls, " +
	"no characters, no creatures, no text, no letters, no numbers, no grid lines, no frame, no logo.";

const STYLES: Record<PlanKey, Style> = {
	region: {
		subject:
			"Open hill country where four dirt roads meet at a leaning signpost, grass, scrub, a few boulders and lone trees.",
		ground: "grass",
		floor: "road",
		passage: "road",
	},
	hamlet: {
		subject:
			"A small palisaded hamlet: a packed-earth square, timber houses with thatched roofs, sheds, a stone well, a gate in the south wall and a grassy hill.",
		ground: "grass",
		floor: "yard",
		passage: "road",
		rooms: { well: "stone", tomb_hill: "green", inn_front: "wood", east_houses: "wood", west_sheds: "plank" },
	},
	inn: {
		subject:
			"Floor plans of a timber inn laid side by side: a ground floor with foyer, common room with trestle tables and hearth, bar and stairs; a guest loft with straw pallets; a cellar with barrels.",
		ground: "rock",
		floor: "wood",
		passage: "plank",
		rooms: { cellar: "stone" },
	},
	tomb: {
		strength: 115,
		subject:
			"An old stone barrow tomb: entrance, antechamber, a hall of sarcophagi, a small shrine, a sealed vault, a lower crypt and a pool of green slime.",
		ground: "rock",
		floor: "stone",
		passage: "stone",
		rooms: { pool: "slime" },
	},
	village: {
		subject:
			"A village of round wooden platforms built among great trees, joined by rope bridges, with a central round platform and a small flowering green.",
		ground: "grass",
		floor: "plank",
		passage: "plank",
		rooms: { green: "green", path_from_hamlet: "road" },
	},
	stonebridge: {
		subject:
			"An old stone bridge carrying a dirt road north to south over a cold river, with reed-lined footpaths along both banks.",
		ground: "grass",
		floor: "stone",
		passage: "road",
		rooms: { south_approach: "road", north_road: "road", east_bank: "yard", west_bank: "yard" },
		scenery: [{ rect: [0, 8, 20, 8], surface: "water" }],
	},
	mill: {
		strength: 115,
		subject:
			"An abandoned mill yard with a round mill tower and a miller's house, beside a cutaway of the rough tunnels and chambers dug beneath it.",
		ground: "earth",
		floor: "cave",
		passage: "cave",
		rooms: {
			yard: "yard",
			grinding_floor: "wood",
			sail_loft: "plank",
			millers_house: "wood",
			altar: "stone",
			grain_cellar: "stone",
		},
	},
	well: {
		subject:
			"A village well and the caves under it: the well mouth, a narrow shaft, a landing, a side niche, a low hall, a rats' nest and a pool of grey ooze.",
		ground: "rock",
		floor: "cave",
		passage: "cave",
		rooms: { mouth: "stone", ooze_pool: "water" },
	},
	goblin_warren: {
		strength: 115,
		subject:
			"A goblin warren of dug-out earthen chambers and crooked tunnels: a guard post, a big common den, two trap niches, a chief's hall and a loot cache.",
		ground: "earth",
		floor: "cave",
		passage: "cave",
	},
	hesper_lodge: {
		strength: 120,
		subject:
			"A gamekeeper's log lodge in a forest clearing: a porch, a main room with a stone hearth, a woodshed, a path from the south and dense trees all around.",
		ground: "grass",
		floor: "yard",
		passage: "road",
		rooms: { main_room: "wood", hearth: "stone", loft: "plank", porch: "plank", woodshed: "plank", tree_line: "green" },
	},
	war_camp: {
		strength: 115,
		subject:
			"A disciplined war camp on trampled ground: a picket line, a row of tents, a cookfire, animal pens, a large command tent and a trail leading out the back.",
		ground: "grass",
		floor: "yard",
		passage: "road",
		rooms: { tent_row: "canvas", command_tent: "canvas", worg_pens: "plank" },
	},
	swamp: {
		subject:
			"A reed swamp with standing water and mud paths: a frog pool, a misty glade, a crooked hut on stilts, a garden of bones and a still backwater.",
		ground: "marsh",
		floor: "earth",
		passage: "earth",
		rooms: { frog_pool: "water", backwater: "water", hag_hut: "plank", will_o_wisp_glade: "green" },
	},
	mine: {
		subject:
			"A worked-out mine: an adit and forecourt, timbered galleries, a crosscut, a deep shaft, a lower hall, a stone crypt and a small locked vault.",
		ground: "rock",
		floor: "cave",
		passage: "cave",
		rooms: { durgan_crypt: "stone", key_vault: "stone" },
	},
	shrine: {
		subject:
			"A forest shrine of pale stone: a hollow under an old oak, a path to the doors, a narthex, a long nave, two round side chapels, a high altar and a crypt.",
		ground: "grass",
		floor: "stone",
		passage: "stone",
		rooms: { oak_hollow: "green", approach_path: "road" },
	},
	bramble_crypt: {
		subject:
			"A small half-buried crypt overgrown with bramble: an entrance, a vestibule, a hall of bones, a side chapel, an ossuary, a false tomb and a hidden crypt.",
		ground: "rock",
		floor: "stone",
		passage: "stone",
	},
	deep_tomb: {
		seed: 2,
		subject:
			"A deep burial level of dark stone: a stair, a barred gate, a long hall, an alcove, a processional way, a pillared court and two burial niches.",
		ground: "rock",
		floor: "stone",
		passage: "stone",
	},
};

/** The world fixture that holds a place's edges. */
function edgesOf(key: PlanKey): Array<[string, string]> {
	const file = join(PACKAGE_ROOT, "fixtures", "adventure", "world", `${key}.toml`);
	// Read the keys line by line: the fixture carries 64-bit cell ids a TOML number cannot hold.
	const keys = [...readFileSync(file, "utf8").matchAll(/^edge_key = "([^"]+)"$/gm)].map((m) => m[1]!);
	const prefix = `kavemouth/${key}/`;
	const seen = new Set<string>();
	const out: Array<[string, string]> = [];
	for (const edgeKey of keys) {
		const [from, to] = edgeKey.split("->");
		if (!from?.startsWith(prefix) || !to?.startsWith(prefix)) continue;
		const pair = [from.slice(prefix.length), to.slice(prefix.length)].sort() as [string, string];
		const id = pair.join("|");
		if (seen.has(id)) continue;
		seen.add(id);
		out.push(pair);
	}
	return out.sort((a, b) => a.join("|").localeCompare(b.join("|")));
}

function paintPlan(key: PlanKey): Buffer {
	const plan = PLANS[key];
	const style = STYLES[key];
	const px = PLAN_CELL_PX;
	const width = plan.cols * px;
	const height = plan.rows * px;
	const rgb = Buffer.alloc(width * height * 3);
	const put = (x: number, y: number, c: Rgb) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return;
		const i = (y * width + x) * 3;
		rgb[i] = c[0];
		rgb[i + 1] = c[1];
		rgb[i + 2] = c[2];
	};
	const fill = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => {
		for (let y = Math.floor(y0); y < Math.ceil(y1); y++)
			for (let x = Math.floor(x0); x < Math.ceil(x1); x++) put(x, y, c);
	};
	fill(0, 0, width, height, SURFACE[style.ground]);
	for (const item of style.scenery ?? []) {
		const [x, y, w, h] = item.rect;
		fill(x * px, y * px, (x + w) * px, (y + h) * px, SURFACE[item.surface]);
	}

	const centre = new Map<string, [number, number]>();
	for (const r of plan.rooms) {
		const [x, y, w, h] = r.rect;
		centre.set(r.local, [(x + w / 2) * px, (y + h / 2) * px]);
	}
	// Passages first, so the rooms sit on top of them.
	const half = px / 2;
	for (const [a, b] of edgesOf(key)) {
		const from = centre.get(a);
		const to = centre.get(b);
		if (!from || !to) throw new Error(`${key}: edge ${a}-${b} names a room the plan lacks`);
		const c = SURFACE[style.passage];
		fill(Math.min(from[0], to[0]) - half, from[1] - half, Math.max(from[0], to[0]) + half, from[1] + half, c);
		fill(to[0] - half, Math.min(from[1], to[1]) - half, to[0] + half, Math.max(from[1], to[1]) + half, c);
	}
	const wall = SURFACE.wall;
	const walled = style.ground === "rock" || style.ground === "earth";
	for (const r of plan.rooms) {
		const [x, y, w, h] = r.rect;
		const c = SURFACE[style.rooms?.[r.local] ?? style.floor];
		const x0 = x * px;
		const y0 = y * px;
		const x1 = (x + w) * px;
		const y1 = (y + h) * px;
		const inset = walled ? 2 : 0;
		if ("round" in r && r.round) {
			const cx = (x0 + x1) / 2;
			const cy = (y0 + y1) / 2;
			const rx = (x1 - x0) / 2;
			const ry = (y1 - y0) / 2;
			for (let py = y0; py < y1; py++)
				for (let qx = x0; qx < x1; qx++) {
					const d = ((qx + 0.5 - cx) / rx) ** 2 + ((py + 0.5 - cy) / ry) ** 2;
					if (d > 1) continue;
					const edge = ((qx + 0.5 - cx) / (rx - inset)) ** 2 + ((py + 0.5 - cy) / (ry - inset)) ** 2;
					put(qx, py, walled && edge > 1 ? wall : c);
				}
		} else {
			if (walled) fill(x0, y0, x1, y1, wall);
			fill(x0 + inset, y0 + inset, x1 - inset, y1 - inset, c);
		}
	}
	// Re-open the doorways the room outlines closed.
	if (walled) {
		for (const [a, b] of edgesOf(key)) {
			const from = centre.get(a)!;
			const to = centre.get(b)!;
			const c = SURFACE[style.passage];
			const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
			for (let s = 0; s <= steps; s++) {
				const onX = s <= Math.abs(to[0] - from[0]);
				const x = onX ? from[0] + Math.sign(to[0] - from[0]) * s : to[0];
				const y = onX ? from[1] : from[1] + Math.sign(to[1] - from[1]) * (s - Math.abs(to[0] - from[0]));
				const i = (Math.floor(y) * width + Math.floor(x)) * 3;
				if (rgb[i] === wall[0] && rgb[i + 1] === wall[1] && rgb[i + 2] === wall[2]) {
					fill(x - half / 2, y - half / 2, x + half / 2, y + half / 2, c);
				}
			}
		}
	}
	texture(rgb, width, height, style.ground);
	return encodePng(width, height, rgb);
}

/** A fixed pseudo-random value in 0..1 for one pixel. */
function noise(x: number, y: number, salt = 0): number {
	let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
	h = (h ^ (h >>> 13)) * 1274126177;
	return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/**
 * Give every flat surface a simple material pattern (planks, flagstones,
 * ripples, tufts, trees), so the image model has structure to refine and
 * leaves the layout where it is.
 */
function texture(rgb: Buffer, width: number, height: number, ground: Surface): void {
	const kindOf = new Map<number, Surface>();
	for (const [name, c] of Object.entries(SURFACE)) {
		kindOf.set((c[0] << 16) | (c[1] << 8) | c[2], name as Surface);
	}
	const kinds: Array<Surface | undefined> = new Array(width * height);
	for (let i = 0; i < width * height; i++) {
		kinds[i] = kindOf.get((rgb[i * 3]! << 16) | (rgb[i * 3 + 1]! << 8) | rgb[i * 3 + 2]!);
	}
	const shade = (i: number, d: number) => {
		for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.max(0, Math.min(255, rgb[i * 3 + k]! + d));
	};
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const i = y * width + x;
			const kind = kinds[i];
			const n = noise(x, y);
			if (kind === "wood" || kind === "plank") {
				const row = Math.floor(y / 4);
				if (y % 4 === 0) shade(i, -22);
				else if ((x + row * 7) % 16 === 0) shade(i, -16);
				else shade(i, Math.round((noise(Math.floor(x / 16), row, 3) - 0.5) * 14));
			} else if (kind === "stone") {
				const row = Math.floor(y / 8);
				if (y % 8 === 0 || (x + (row % 2) * 4) % 8 === 0) shade(i, -20);
				else shade(i, Math.round((noise(Math.floor((x + (row % 2) * 4) / 8), row, 5) - 0.5) * 16));
			} else if (kind === "water" || kind === "slime") {
				if (y % 6 === 2 && noise(Math.floor(x / 5), y, 7) > 0.55) shade(i, 24);
				else shade(i, Math.round((n - 0.5) * 8));
			} else if (kind === "grass" || kind === "green" || kind === "marsh") {
				shade(i, n > 0.93 ? 22 : n < 0.08 ? -18 : Math.round((n - 0.5) * 8));
			} else if (kind === "wall") {
				// keep walls solid
			} else if (kind !== undefined) {
				shade(i, n > 0.95 ? 18 : n < 0.06 ? -18 : Math.round((n - 0.5) * 10));
			}
		}
	if (ground !== "grass" && ground !== "marsh") return;
	// Trees on open ground, away from every room and passage.
	const radius = 7;
	for (let cy = radius + 1; cy < height - radius - 1; cy += 5)
		for (let cx = radius + 1; cx < width - radius - 1; cx += 5) {
			if (noise(cx, cy, 11) < 0.82) continue;
			let free = true;
			for (let dy = -radius - 3; dy <= radius + 3 && free; dy += 2)
				for (let dx = -radius - 3; dx <= radius + 3 && free; dx += 2) {
					const x = cx + dx;
					const y = cy + dy;
					if (x < 0 || y < 0 || x >= width || y >= height) continue;
					if (kinds[y * width + x] !== ground) free = false;
				}
			if (!free) continue;
			for (let dy = -radius; dy <= radius; dy++)
				for (let dx = -radius; dx <= radius; dx++) {
					const d = dx * dx + dy * dy;
					if (d > radius * radius) continue;
					const i = (cy + dy) * width + cx + dx;
					const lit = dx + dy < -3 ? 14 : 0;
					const c: Rgb = ground === "marsh" ? [48, 70, 52] : [52, 86, 46];
					for (let k = 0; k < 3; k++) rgb[i * 3 + k] = c[k]! + lit + (d > (radius - 2) ** 2 ? -16 : 0);
					kinds[i] = "wall";
				}
		}
}

function crc32(buf: Buffer): number {
	let c = ~0;
	for (const byte of buf) {
		c ^= byte;
		for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
	}
	return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const head = Buffer.alloc(4);
	head.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const tail = Buffer.alloc(4);
	tail.writeUInt32BE(crc32(body));
	return Buffer.concat([head, body, tail]);
}

/** 8-bit RGB PNG without ancillary chunks, so the bytes depend only on the pixels. */
function encodePng(width: number, height: number, rgb: Buffer): Buffer {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8;
	ihdr[9] = 2;
	const raw = Buffer.alloc((width * 3 + 1) * height);
	for (let y = 0; y < height; y++) {
		rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

function blueprint(key: PlanKey): string {
	const plan = PLANS[key];
	const id = `kavemouth-map-${key.replaceAll("_", "-")}`;
	return `${JSON.stringify(
		{
			schema: "spellkave-pixellab-blueprint/v1",
			id,
			description: `${STYLES[key].subject} ${TOP_DOWN}`,
			negative_description: "text, letters, numbers, labels, grid, people, monsters, isometric, side view, border, watermark",
			image_size: { width: plan.cols * PLAN_CELL_PX, height: plan.rows * PLAN_CELL_PX },
			view: "high top-down",
			outline: "selective outline",
			shading: "medium shading",
			detail: "highly detailed",
			init_image: relative(REPO_ROOT, join(PLAN_DIR, `${key}.png`)),
			init_image_strength: STYLES[key].strength ?? 90,
			seed: STYLES[key].seed ?? 1,
			output_directory: `pixellab-generations/kavemouth-maps/${key}`,
			output_filename: `${key}.png`,
			provenance: {
				license: "CC-BY-4.0",
				source: "Kavemouth place backdrops over first-party floor plans (author/lib/layouts.ts)",
			},
		},
		null,
		"\t",
	)}\n`;
}

const check = process.argv.includes("--check");
const stale: string[] = [];
const emit = (path: string, bytes: Buffer | string) => {
	const next = typeof bytes === "string" ? Buffer.from(bytes) : bytes;
	let same = false;
	try {
		same = readFileSync(path).equals(next);
	} catch {
		same = false;
	}
	if (same) return;
	if (check) {
		stale.push(relative(REPO_ROOT, path));
		return;
	}
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, next);
};

const index: Record<string, { plan_sha256: string; width: number; height: number }> = {};
for (const key of Object.keys(PLANS) as PlanKey[]) {
	const png = paintPlan(key);
	emit(join(PLAN_DIR, `${key}.png`), png);
	emit(join(BLUEPRINT_DIR, `${key}.blueprint.json`), blueprint(key));
	index[key] = {
		plan_sha256: createHash("sha256").update(png).digest("hex"),
		width: PLANS[key].cols * PLAN_CELL_PX,
		height: PLANS[key].rows * PLAN_CELL_PX,
	};
}
emit(join(PLAN_DIR, "index.json"), `${JSON.stringify(index, null, "\t")}\n`);

if (check && stale.length > 0) {
	console.error(`[kavemouth-maps] stale, run the script without --check:\n${stale.join("\n")}`);
	process.exit(1);
}
console.log(`[kavemouth-maps] ${check ? "OK" : "wrote"} ${Object.keys(index).length} plans and blueprints`);
