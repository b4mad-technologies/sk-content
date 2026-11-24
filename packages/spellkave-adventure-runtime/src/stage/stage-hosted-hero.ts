/**
 * Give the local player a hero seat in a world that was NOT seeded here — a
 * hosted world opened with `just play-load <save>` (sk-jay0.7.79).
 *
 * Never wipes, never seeds: the world already exists. It claims the
 * adventure's hero actor (or `--hero <actor-key>`) with a fresh retained
 * credential, persists the bind, and writes the persona profile — the same
 * seat step `just play-stage` runs after its seed chain (hero-seat.ts), so
 * the player surface finds the hero exactly where it always does. The seat
 * must be free: `play-load` releases the hosted identity-scoped bindings
 * first, because the hosted player's identity cannot sign in here.
 *
 *   stage-hosted-hero.ts <adventure> [--hero <actor-key>]
 *
 * Env: SPELLKAVE_URL, SPELLKAVE_DB (the hosted database name).
 */
import { repoRoot } from "../repo-root.ts";
import { loadAdventureDescriptor } from "./adventure-descriptor.ts";
import { discoverRestoredHero } from "./hero-bootstrap.ts";
import {
	asEntityRef,
	claimHeroSeat,
	resolvePlayerCredentialPath,
	writeHeroProfile,
	writeStagePointers,
} from "./hero-seat.ts";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (value === undefined || value === "") {
		throw new Error(
			`${name} is not set — run this through \`just play-load\` (or source scripts/dev/node-env.sh and export SPELLKAVE_DB) so the per-worktree node env is exported.`,
		);
	}
	return value;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	let adventure = "";
	let heroOverride = "";
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? "";
		if (arg === "--hero") {
			heroOverride = args[++i] ?? "";
		} else if (arg.startsWith("--hero=")) {
			heroOverride = arg.slice("--hero=".length);
		} else if (adventure === "") {
			adventure = arg;
		} else {
			throw new Error(`unexpected argument '${arg}'`);
		}
	}
	if (adventure === "") {
		throw new Error("usage: stage-hosted-hero.ts <adventure> [--hero <actor-key>]");
	}
	const descriptor = loadAdventureDescriptor(adventure);
	const url = requireEnv("SPELLKAVE_URL");
	const db = requireEnv("SPELLKAVE_DB");
	const heroKey =
		heroOverride !== ""
			? asEntityRef(heroOverride)
			: await discoverRestoredHero({
					url,
					db,
					blueprintId: descriptor.player.hero_seat_blueprint,
					nodeId: descriptor.player.hero_seat_node,
				});
	const tokenPath = resolvePlayerCredentialPath(repoRoot(), descriptor.player.credential);

	const seat = await claimHeroSeat({ url, db, heroKey, tokenPath });
	const profileName = process.env.SPELLKAVE_HANDPLAY_PROFILE ?? descriptor.player.profile;
	const written = writeHeroProfile({
		url,
		db,
		entityId: seat.entityId,
		tokenPath,
		profileName,
		generatedBy: `just play-load (hosted save, adventure ${descriptor.name})`,
		repoRoot: repoRoot(),
	});
	writeStagePointers(repoRoot(), descriptor.player.pi_profile, descriptor.name);

	process.stdout.write(
		[
			`stage-hosted-hero: hero '${heroKey}' claimed as entity ${seat.entityId} (actor ${seat.actorId}) in ${db}`,
			`  profile '${profileName}' at ${written.profilePath}`,
			`  play-dev-local reads the per-worktree copy at ${written.localProfilePath}`,
			"  NPC cast requires the Rust host; local hand-play startup: sk-jay0.1.55.60.41.",
			`  player tools: 'just pi-handplay' or 'just play-orient ${descriptor.name}'`,
			"",
		].join("\n"),
	);
}

await main();
