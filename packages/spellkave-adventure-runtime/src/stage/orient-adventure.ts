/**
 * Print one JSON orientation for an adventure's staged PLAYER seat — what that
 * actor can currently establish about its own situation, read through the
 * PLAYER tool surface and nothing else.
 *
 * WHY THIS EXISTS: `just play-load` restores the world, but not the agent that
 * was playing it. A reloaded world meets a conversation that remembers a future
 * which no longer happened, and the agent will keep playing confidently from
 * that memory. The honest move is a FRESH session plus this payload: situation
 * re-derived from the world, no inherited past.
 *
 * BLINDNESS IS STRUCTURAL, not a promise made here. Everything comes from
 * `@spellkave/session/player-tools`' `orientSeatFromContext`, which speaks only the PLAYER-facing tool
 * map, so the payload can contain nothing this actor may not perceive. Reading
 * the same facts with `just sql` would be omniscient — and would silently void
 * a blind run while looking perfectly reasonable.
 *
 * Connects EXACTLY the way the player surface does: via the persona profile the
 * stager wrote (`~/.config/spellkave/profiles/<profile>.toml`) and its retained
 * credential, through `@spellkave/session`'s `openSession`. A different
 * connection path could see a different world, which would make this a
 * measurement of the rig rather than of the seat.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { createMemorySink, createRunEmitter } from "@spellkave/agent-observability";
import { snapshotDb } from "@spellkave/sdk";
import { openSession, type SessionBinding } from "@spellkave/session";
import { orientSeatFromContext } from "@spellkave/session/player-tools";
import { parse as parseToml } from "smol-toml";

import { loadAdventureDescriptor } from "./adventure-descriptor.ts";

interface PersonaProfile {
	connection: { url: string; db: string };
	identity: { in_world_self: string; credential: { path: string } };
}

function profilesDir(): string {
	const home = process.env.SPELLKAVE_HOME ?? homedir();
	const xdg = process.env.XDG_CONFIG_HOME ?? join(home, ".config");
	return join(xdg, "spellkave", "profiles");
}

function loadProfile(name: string): PersonaProfile {
	const path = join(profilesDir(), `${name}.toml`);
	try {
		return parseToml(readFileSync(path, "utf8")) as unknown as PersonaProfile;
	} catch {
		throw new Error(
			`no persona profile at ${path} — the world is not staged for a player; run 'just play-stage'`,
		);
	}
}

/**
 * The `spacetimedb` npm package's own internal logger writes connect progress
 * ("Connecting to SpacetimeDB WS...") straight to `console.log` — stdout —
 * with no injection seam anywhere in the chain below `@spellkave/sdk`'s
 * `connect()`. This payload is meant to be piped into an agent, so a stray
 * human-readable line on stdout makes it unparseable. Same scoped redirect,
 * same rationale, as `packages/spellkave-cli/src/cli.ts`'s
 * `withConsoleLogOnStderr` — restored in `finally` regardless of outcome.
 */
async function withConsoleLogOnStderr<T>(fn: () => Promise<T>): Promise<T> {
	const original = console.log;
	console.log = (...args: unknown[]) => {
		console.error(...args);
	};
	try {
		return await fn();
	} finally {
		console.log = original;
	}
}

async function main(): Promise<void> {
	const adventure = process.argv[2] ?? "kavemouth";
	const descriptor = loadAdventureDescriptor(adventure);
	const profileName = process.env.SPELLKAVE_HANDPLAY_PROFILE ?? descriptor.player.profile;
	const profile = loadProfile(profileName);

	const token = readFileSync(profile.identity.credential.path, "utf8").trim();
	// #1992 convention (mirrored from the pi extension's connection-controller
	// and `packages/spellkave-cli`'s `resolveLiveToken`): `identity` is the
	// sha256 hex of the resolved token, never the raw secret — a binding is a
	// value object any consumer may echo, hash or log. The token itself travels
	// separately below.
	const binding: SessionBinding = {
		url: profile.connection.url,
		db: profile.connection.db,
		identity: createHash("sha256").update(token).digest("hex"),
		actorId: profile.identity.in_world_self,
	};

	// The orientation read is telemetered like any other tool call. Nothing
	// consumes those events here (this is a one-shot operator read, not a run),
	// so they land in a memory sink and are dropped with the process.
	const emitter = createRunEmitter(
		{
			run_id: `orient-${adventure}`,
			run_kind: "world_observation",
			actor_id: profile.identity.in_world_self,
			role: "PLAYER",
			controller_kind: "service",
			driver: "orient-adventure",
			deterministic: true,
		},
		[createMemorySink()],
	);

	const orientation = await withConsoleLogOnStderr(async () => {
		const session = await openSession(binding, { token });
		try {
			// The bare tool context the orientation read wants, over this one-shot session.
			return await orientSeatFromContext(
				session.actorId,
				{
					controlReducers: session.session.conn.reducers,
					db: () => snapshotDb(session.session),
					act: { actorId: session.actorId, actorClient: session.actorClient },
				},
				emitter,
			);
		} finally {
			session.close();
		}
	});
	process.stdout.write(`${JSON.stringify(orientation, null, 2)}\n`);
}

await main();
