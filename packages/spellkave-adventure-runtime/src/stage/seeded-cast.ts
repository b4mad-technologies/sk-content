/**
 * The live half of the cast check `just play-stage` runs right after seeding:
 * is every REQUIRED `cast.toml` member present in the seeded world?
 *
 * `cast.toml`'s own header names the hazard: TOML cannot import the TS
 * authoring constant, so a renamed entity key drifts silently. Without this
 * check the first symptom is the launcher's claim failing minutes later
 * ("body not visible in live actor snapshot"), in another terminal, after the
 * operator has already moved on — a staging-time error costs nothing and
 * points straight at the key. The offline twin is `check-adventure-cast.ts`
 * (committed seed chain, no node).
 *
 * The check reads the publisher-only `operator_manifest_authored_entity` view
 * over the operator's own `spacetime sql` path: the local CLI identity
 * published the module, so it sees every row. It must not read a player's
 * snapshot. Since
 * 2a6e6dca98 the public `visible_manifest_authored_entity` view admits only
 * the caller's own subjects, so a freshly claimed hero resolves its own key
 * and nothing else — every NPC looked "missing" (sk-jay0.7.274).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { parse as parseToml } from "smol-toml";

/** Reads which of `keys` the seeded world maps to an entity. */
export type SeededKeyReader = (keys: readonly string[]) => ReadonlySet<string>;

/** The cast's REQUIRED `actor_key`s, read straight from the manifest the HOST
 * will load — not a second list maintained here. */
export function requiredCastActorKeys(castToml: string): readonly string[] {
	const parsed = parseToml(castToml) as unknown as {
		actors?: readonly { actor_key: string; required?: boolean }[];
	};
	// `required = false` marks cast members whose body is created later in
	// play (sk-609b.15: companions spawn at offer-accept). They are absent from
	// the freshly seeded world by design, so staging must not demand them.
	return (parsed.actors ?? [])
		.filter((actor) => actor.required !== false)
		.map((actor) => actor.actor_key);
}

/** Throws naming every missing required member; returns the checked keys. */
export function verifySeededCast(castPath: string, readSeeded: SeededKeyReader): readonly string[] {
	const keys = requiredCastActorKeys(readFileSync(castPath, "utf8"));
	const present = readSeeded(keys);
	const missing = keys.filter((key) => !present.has(key));
	if (missing.length > 0) {
		throw new Error(
			`cast members are missing from the seeded world: ${missing.join(", ")}\n` +
				`  (declared in ${castPath}; either the seed chain is incomplete or an ` +
				"authoring key was renamed without updating the cast manifest)",
		);
	}
	return keys;
}

/** `SeededKeyReader` over the local node's operator SQL path. */
export function operatorSeededKeyReader(db: string): SeededKeyReader {
	return (keys) => {
		if (keys.length === 0) return new Set();
		const authored = readOperatorAuthoredKeys(db);
		const wanted = new Set(keys);
		return new Set([...authored.keys()].filter((key) => wanted.has(key)));
	};
}

/**
 * Every authored key in the world → its bundle, read from the publisher-only
 * `operator_manifest_authored_entity` view with the local `spacetime` CLI
 * identity (`SPACETIME_CONFIG_PATH`) against `server` (a `spacetime` server
 * name, default `local`). Shared by the stager's cast check and the NPC cast
 * publisher setup (`host/cast-publisher-bind.ts`). A CLI read, not an SDK
 * owner subscription: ADR-0150 D-2 keeps `sk` the one owner-subscription client.
 */
export function readOperatorAuthoredKeys(db: string, server = "local"): Map<string, string> {
	const output = execFileSync(
		"spacetime",
		[
			...(process.env.SPACETIME_CONFIG_PATH
				? ["--config-path", process.env.SPACETIME_CONFIG_PATH]
				: []),
			"sql",
			"--server",
			server,
			db,
			"SELECT manifest_key FROM operator_manifest_authored_entity",
		],
		{ encoding: "utf8" },
	);
	const authored = authoredKeysFromSql(output);
	if (authored.size === 0) {
		// The view is empty for any non-publisher caller; do not report that
		// as a missing cast.
		throw new Error(
			`operator_manifest_authored_entity returned no rows on '${db}' — ` +
				"is the spacetime CLI identity the module's publisher?",
		);
	}
	return authored;
}

/**
 * The authored keys in a `SELECT manifest_key` table from `spacetime sql`,
 * mapped to their bundle. Stored keys carry their bundle
 * (`kavemouth:kavemouth/adventure/innkeeper_1`); the cast names the part
 * after the first `:`, the same match the SDK's `resolveEntityId` makes.
 */
export function authoredKeysFromSql(output: string): Map<string, string> {
	const keys = new Map<string, string>();
	for (const line of output.split("\n")) {
		const cell = /^\s*"(.*)"\s*$/.exec(line)?.[1];
		const idx = cell?.indexOf(":") ?? -1;
		if (cell !== undefined && idx >= 0) keys.set(cell.slice(idx + 1), cell.slice(0, idx));
	}
	return keys;
}
