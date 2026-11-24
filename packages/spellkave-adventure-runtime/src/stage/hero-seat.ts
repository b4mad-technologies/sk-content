/**
 * The PLAYER seat, as one reusable step: claim a hero actor with a fresh
 * retained credential, persist the bind, and leave a persona profile where
 * the player surface looks for it.
 *
 * Extracted from stage-adventure.ts (sk-jay0.7.79) so that a world which was
 * NOT seeded here — a hosted world opened with `just play-load` — gets its
 * hero through exactly the same path instead of a second profile writer.
 * stage-adventure.ts still owns wipe + seed chain + cast check; this module
 * owns only the seat.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	asEntityRef,
	type EntityRef,
	readActorIdentityBindings,
	resolveEntityId,
} from "@spellkave/sdk";
import { resolveCliPaths, writeLastUsedProfile } from "@spellkave/sdk/node";
import { connectStagedActor } from "./actor-connection.ts";

export function profilesDir(): string {
	const home = process.env.SPELLKAVE_HOME ?? homedir();
	const xdg = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
	return join(xdg, "spellkave", "profiles");
}

/** Overrides `descriptor.player.credential` — the same shape (repo-relative,
 * joined under `repoRoot`) as the descriptor field itself, mirroring how
 * `SPELLKAVE_HANDPLAY_PROFILE` overrides `descriptor.player.profile`
 * (`stage-adventure.ts`, `stage-hosted-hero.ts`). Lets several `sknpc run`
 * arms share one worktree node without fighting over one hero token
 * (sk-jay0.1.23.36.22.9.2 — the parent table's `hero credential` blocker). */
export const PLAYER_CREDENTIALS_ENV = "SPELLKAVE_PLAYER_CREDENTIALS";

/** Pure resolver for `PLAYER_CREDENTIALS_ENV`, split out so it is unit-
 * testable without a filesystem or a live claim — `env` defaults to
 * `process.env` so both call sites (`stage-adventure.ts`,
 * `stage-hosted-hero.ts`) can drop the parameter entirely. */
export function resolvePlayerCredentialPath(
	repoRoot: string,
	descriptorCredential: string,
	env: NodeJS.ProcessEnv = process.env,
): string {
	const override = env[PLAYER_CREDENTIALS_ENV]?.trim();
	return join(repoRoot, override && override.length > 0 ? override : descriptorCredential);
}

export interface ClaimHeroSeatOptions {
	readonly url: string;
	readonly db: string;
	readonly heroKey: EntityRef;
	/** Where the freshly minted credential is retained (0600). */
	readonly tokenPath: string;
}

export interface ClaimedHeroSeat {
	readonly entityId: bigint;
	readonly actorId: string;
	readonly identity: string;
}

/**
 * Claim `heroKey` over the floor-tier profile (`connectStagedActor`), retain the
 * credential, then re-bind PERSISTENTLY (connection_id = None) over the
 * operator's trusted path — a claim made over a live connection is
 * connection-scoped and `release_actor_identity_bindings_on_disconnect` drops
 * it the moment the process exits, which would put the next connection right
 * back in the resolveActor chicken-and-egg (ADR-0097; same idiom
 * npc-host-elven-mini.ts uses for Aldwin). Staging is operator work; the
 * player surface never touches `r_bind_actor_identity`.
 */
export async function claimHeroSeat(options: ClaimHeroSeatOptions): Promise<ClaimedHeroSeat> {
	const { url, db, heroKey, tokenPath } = options;
	mkdirSync(dirname(tokenPath), { recursive: true, mode: 0o700 });
	const seat = await connectStagedActor(url, db, heroKey, {
		retainCredential: async (credential) => {
			writeFileSync(tokenPath, `${credential}\n`, { mode: 0o600 });
		},
	});
	// The persona profile pins the NUMERIC entity id, not the manifest key:
	// `resolveActor` only matches a key through the `visible_manifest_authored_entity`
	// alias map, and the pi extension's connection does not carry that table.
	const entityId = resolveEntityId(seat.snapshot(), heroKey);
	// The self-only view can include presence bindings; persist the character primary.
	const binding = readActorIdentityBindings(seat.snapshot()).find((row) => row.role === "primary");
	seat.disconnect();
	if (entityId === undefined) {
		throw new Error(`could not resolve an entity id for '${heroKey}' after the claim`);
	}
	if (binding === undefined) {
		throw new Error(
			`no actor_identity binding observed for '${heroKey}' after the claim — cannot persist the bind`,
		);
	}
	execFileSync(
		"spacetime",
		[
			...(process.env.SPACETIME_CONFIG_PATH
				? ["--config-path", process.env.SPACETIME_CONFIG_PATH]
				: []),
			"call",
			"--server",
			"local",
			db,
			"r_bind_actor_identity",
			binding.actor_id,
			JSON.stringify(binding.identity.replace(/^0x/, "")),
			JSON.stringify("primary"),
			"null",
		],
		{ encoding: "utf8" },
	);
	return { entityId, actorId: binding.actor_id, identity: binding.identity };
}

export interface HeroProfileOptions {
	readonly url: string;
	readonly db: string;
	readonly entityId: bigint;
	readonly tokenPath: string;
	readonly profileName: string;
	/** Which `just` invocation wrote it — the profile's own header says so. */
	readonly generatedBy: string;
	readonly repoRoot: string;
}

export interface WrittenHeroProfile {
	readonly profilePath: string;
	readonly localProfilePath: string;
}

/**
 * Write the persona profile twice: the USER-level XDG copy that `sk` and
 * pi-handplay read, and the WORKTREE-LOCAL copy (`.local/profiles/`) that
 * `just play-dev-local` / `apps/play/vite.config.ts` read first — two
 * worktrees staging the same adventure would otherwise clobber each other's
 * `[connection] url` (sk-jay0.7.35). Also remembers it as the last-used
 * profile so Pi/`sk` connect without an explicit one (sk-sol).
 */
export function writeHeroProfile(options: HeroProfileOptions): WrittenHeroProfile {
	const { url, db, entityId, tokenPath, profileName, generatedBy, repoRoot } = options;
	const profilePath = join(profilesDir(), `${profileName}.toml`);
	const profileToml = [
		`# Generated by \`${generatedBy}\``,
		"# (packages/spellkave-adventure-runtime/src/stage/hero-seat.ts, sk-dms.9).",
		"# Regenerated on every stage; the credential it points at is minted and",
		"# actor-claimed by that script.",
		"[connection]",
		`url = ${JSON.stringify(url)}`,
		`db = ${JSON.stringify(db)}`,
		"",
		"[identity]",
		'role = "player"',
		`in_world_self = ${JSON.stringify(String(entityId))}`,
		"",
		"[identity.credential]",
		'kind = "file"',
		`path = ${JSON.stringify(tokenPath)}`,
		"",
	].join("\n");
	mkdirSync(dirname(profilePath), { recursive: true });
	writeFileSync(profilePath, profileToml);
	const localProfilePath = join(repoRoot, ".local", "profiles", `${profileName}.toml`);
	mkdirSync(dirname(localProfilePath), { recursive: true });
	writeFileSync(localProfilePath, profileToml);
	try {
		writeLastUsedProfile(resolveCliPaths(), profileName);
	} catch {
		// Remembered profile is convenience state, never staging authority.
	}
	return { profilePath, localProfilePath };
}

/**
 * The two launcher pointers next to the profile: which pi BRIEF the hand-play
 * agent wears (sk-apz — the pi profile's `PROFILE_KEYS` allowlist cannot
 * resolve this itself) and WHICH ADVENTURE is staged (sk-0m4.1 — the NPC host
 * has no other way to know). Regenerated on every stage.
 */
export function writeStagePointers(repoRoot: string, piProfile: string, adventure: string): void {
	const piProfilePointer = join(repoRoot, ".local", "handplay-profile");
	mkdirSync(dirname(piProfilePointer), { recursive: true });
	writeFileSync(piProfilePointer, `${piProfile}\n`);
	const stagedAdventurePointer = join(repoRoot, ".local", "staged-adventure");
	writeFileSync(stagedAdventurePointer, `${adventure}\n`);
}

export { asEntityRef };
