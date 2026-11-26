/**
 * Stage ONE adventure into the local world: wipe, apply its seed chain, and
 * claim the PLAYER seat. Driven by `just play-stage <adventure>`; the
 * adventure is data (`scripts/adventures/<name>.toml`), not a recipe.
 *
 * WHY THE SEAT NEEDS STAGING AT ALL (sk-dms.9): a player-facing surface cannot
 * bootstrap itself. The pi extension's `spellkave_connect` and `sk`'s session
 * daemon both route through `@spellkave/session`'s `openSession`, which calls
 * `resolveActor` BEFORE any claim — and `resolveActor` reads
 * `visible_actor_spatial_location`, a view that is EMPTY for an identity
 * controlling nothing. Fresh world + fresh identity => fail-closed, forever.
 * sk-dms.5's player-agent broke out of that loop with bash (hand-written
 * `r_claim_actor` scripts + a hand-authored persona profile); once the play
 * recipe denylisted bash there was no way in at all (sk-dms.8 live re-run).
 *
 * The NPC seats never hit this because `@spellkave/npc`'s `connectNpcActor`
 * claims over the FLOOR-TIER subscription profile, which carries the claim
 * tables themselves. This script reuses that exact path for the hero, then
 * leaves the result where the player surface already knows to look: a persona
 * profile (`~/.config/spellkave/profiles/<name>.toml`) with a retained
 * credential — NOT an env var (`SPELLKAVE_PLAYER_ACTOR_ID` is read by nothing;
 * sk-dms.11).
 *
 * Idempotent against a re-run with the same retained credential.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { repoRoot } from "../repo-root.ts";
import { loadAdventureDescriptor } from "./adventure-descriptor.ts";
import { bootstrapHeroSeat } from "./hero-bootstrap.ts";
import {
	claimHeroSeat,
	resolvePlayerCredentialPath,
	writeHeroProfile,
	writeStagePointers,
} from "./hero-seat.ts";
import { operatorSeededKeyReader, verifySeededCast } from "./seeded-cast.ts";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (value === undefined || value === "") {
		throw new Error(
			`${name} is not set — run this through \`just play-stage\` (or source scripts/dev/node-env.sh) so the per-worktree node env is exported.`,
		);
	}
	return value;
}

function requireDb(): string {
	return requireEnv("SPELLKAVE_DB");
}

/** Node lifecycle and manifest application stay in `just`, which already owns
 * the per-worktree env and the wasm build; this script owns only the ORDER,
 * so the seed chain has exactly one written-down source (the descriptor). */
function runJust(args: readonly string[], env: NodeJS.ProcessEnv): void {
	execFileSync("just", [...args], { cwd: repoRoot(), env, stdio: "inherit" });
}

async function main(): Promise<void> {
	const adventure = process.argv[2];
	if (adventure === undefined || adventure === "") {
		throw new Error("usage: stage-adventure.ts <adventure>   (e.g. kavemouth)");
	}
	const descriptor = loadAdventureDescriptor(adventure);
	if (!descriptor.player.hero_seat_open_action) {
		throw new Error(
			"Fresh staging requires player.hero_seat_open_action naming the authored open-seat act.",
		);
	}
	const url = requireEnv("SPELLKAVE_URL");
	const db = requireDb();

	const env: NodeJS.ProcessEnv = {
		...process.env,
		SPELLKAVE_TICK_INTERVAL_SECS: String(descriptor.tick_interval_secs),
	};
	runJust(["wipe"], env);
	const extraSeeds = (process.env.SPELLKAVE_STAGE_EXTRA_SEEDS ?? "")
		.split(",")
		.map((seed) => seed.trim())
		.filter((seed) => seed !== "");
	for (const seed of [...descriptor.seeds, ...extraSeeds]) {
		runJust(["seed", seed], env);
	}

	const castKeys = verifySeededCast(
		join(repoRoot(), descriptor.npcs.cast),
		operatorSeededKeyReader(db),
	);

	const tokenPath = resolvePlayerCredentialPath(repoRoot(), descriptor.player.credential);
	const heroKey = await bootstrapHeroSeat({
		url,
		db,
		blueprintId: descriptor.player.hero_seat_blueprint,
		nodeId: descriptor.player.hero_seat_node,
		actionId: descriptor.player.hero_seat_open_action,
	});
	// The seat step is shared with `just play-load` for hosted saves (hero-seat.ts).
	const seat = await claimHeroSeat({ url, db, heroKey, tokenPath });
	const entityId = seat.entityId;

	const profileName = process.env.SPELLKAVE_HANDPLAY_PROFILE ?? descriptor.player.profile;
	const { profilePath, localProfilePath } = writeHeroProfile({
		url,
		db,
		entityId,
		tokenPath,
		profileName,
		generatedBy: `just play-stage ${descriptor.name}`,
		repoRoot: repoRoot(),
	});
	const piProfileName = descriptor.player.pi_profile;
	writeStagePointers(repoRoot(), piProfileName, descriptor.name);

	process.stdout.write(
		[
			`stage-adventure: '${descriptor.name}' staged — ${descriptor.description}`,
			`  hero '${heroKey}' claimed as entity ${entityId}; profile '${profileName}' at ${profilePath}`,
			`  play-dev-local reads the per-worktree copy at ${localProfilePath}`,
			`  hand-play brief: pi profile '${piProfileName}'`,
			`  cast present (${castKeys.length}): ${castKeys.join(", ")}`,
			`  clock ${descriptor.tick_interval_secs}s/tick`,
			"  NPC cast requires the Rust host; local hand-play startup: sk-jay0.1.55.60.41.",
			"  player tools: 'just pi-handplay'",
			`  freeze this beat any time with 'just play-save <name>'`,
			"",
		].join("\n"),
	);
}

await main();
