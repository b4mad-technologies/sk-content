/**
 * One reader for `adventures/<name>.toml`, shared by everything that boots an
 * adventure — the stager, the NPC host launcher, the orientation read.
 *
 * The descriptor points at the adventure package's `npcs/cast.toml` instead
 * of copying its roster. Build-time author modules seal kind documents for
 * the Rust NPC host; no TypeScript catalog or brain code is loaded here.
 * Credentials and transcripts remain descriptor-owned paths for staging.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parse as parseToml } from "smol-toml";

import { adventureDescriptorSearchDirs, adventureDescriptorsDir } from "../repo-root.ts";

export interface AdventureDescriptor {
	name: string;
	description: string;
	tick_interval_secs: number;
	seeds: readonly string[];
	player: {
		/** The world-owned playable blueprint and the node where creation opens. */
		hero_seat_blueprint: string;
		hero_seat_node: string;
		/** Authored open-seat action, required by fresh staging; restored worlds need no spawn. */
		hero_seat_open_action?: string;
		profile: string;
		credential: string;
		/**
		 * The PI profile whose brief the hand-play agent wears (`.pi/profiles/
		 * <name>.json` + its `systemPromptFile`) — as distinct from `profile`
		 * above, which is the persona/credential this script mints.
		 *
		 * It is a separate field because the two answer different questions and
		 * a brief cannot be derived from a persona name: the brief carries the
		 * agent's IDENTITY FRAMING, and a level-0 candidate who has no name,
		 * class or ability scores yet needs different words than a pregen
		 * level-1 hero, not just a different profile string.
		 *
		 * Why it must exist at all (sk-apz): `.pi/profiles/spellkave_handplay.md`
		 * hardcoded both halves — "You are Renn the Roadwarden, a level-1 elven
		 * adventurer" and `spellkave_connect { "profile": "elven-mini-renn" }`.
		 * Every other fact about which body the player steers was already data
		 * here, so staging dm-creation-prequel produced a world where the player
		 * was told to connect as a seat nobody had claimed. It failed as a
		 * connection error, and the level-0 arc was unplayable by hand for two
		 * sessions without anyone seeing why.
		 *
		 * The brief has to live in `.pi/profiles/` — the extension enforces
		 * "systemPromptFile must stay inside its profile directory"
		 * (`profile.ts`) — so this points at one, rather than the stager writing
		 * a brief into a checked-in file on every stage.
		 */
		pi_profile: string;
	};
	npcs: {
		cast: string;
		credentials: string;
		transcripts: string;
	};
}

/**
 * The module's accepted world-clock range — `Config::default_seed`'s
 * `min_tick_interval_secs` / `max_tick_interval_secs` in
 * `server/src/config.rs`. `adventure-descriptor.test.ts` pins this copy to that
 * source, so a server change fails offline instead of at `just play-stage`
 * (sk-jay0.7.199: a 2 s descriptor clock the server refused).
 */
export const TICK_INTERVAL_BOUNDS_SECS = { min: 5, max: 86400 } as const;

/** The name indexes a file, so it must not be able to walk out of the
 * directory it indexes. */
export function assertAdventureName(adventure: string): string {
	if (!/^[a-z0-9][a-z0-9-]*$/.test(adventure)) {
		throw new Error(
			`invalid adventure name '${adventure}' (allowed: lowercase letters, digits, '-')`,
		);
	}
	return adventure;
}

export function adventureDescriptorPath(adventure: string, descriptorsDir?: string): string {
	const name = `${assertAdventureName(adventure)}.toml`;
	if (descriptorsDir !== undefined) return join(descriptorsDir, name);
	for (const dir of adventureDescriptorSearchDirs()) {
		const candidate = join(dir, name);
		if (existsSync(candidate)) return candidate;
	}
	return join(adventureDescriptorsDir(), name);
}

export function loadAdventureDescriptor(adventure: string): AdventureDescriptor {
	const path = adventureDescriptorPath(adventure);
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		throw new Error(
			`no adventure descriptor at ${path} — add one (see elven-mini.toml) or check the name`,
		);
	}
	const parsed = parseToml(raw) as unknown as AdventureDescriptor;
	for (const field of ["seeds", "player", "npcs"] as const) {
		if (parsed[field] === undefined) {
			throw new Error(`${path} is missing required field '${field}'`);
		}
	}
	const tick = parsed.tick_interval_secs;
	const { min, max } = TICK_INTERVAL_BOUNDS_SECS;
	if (!Number.isInteger(tick) || tick < min || tick > max) {
		throw new Error(
			`${path}: tick_interval_secs = ${String(tick)} is outside the module's accepted ${min}..${max} s range (server/src/config.rs)`,
		);
	}
	// Fail HERE, not at the player's first tool call. sk-apz's whole cost was
	// that the miss surfaced minutes later, in another process, as a connection
	// error — the same reason the cast is checked at staging time (seeded-cast.ts) rather
	// than left to the host's claim.
	for (const field of [
		"hero_seat_blueprint",
		"hero_seat_node",
		"profile",
		"credential",
		"pi_profile",
	] as const) {
		if (typeof parsed.player[field] !== "string" || parsed.player[field].length === 0) {
			throw new Error(`${path} is missing required field 'player.${field}'`);
		}
	}
	return parsed;
}
