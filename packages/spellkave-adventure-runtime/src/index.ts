/**
 * @spellkave/adventure-runtime — adventure-generic authoring library (ADR-0115 D-3/D-4).
 *
 * Prefer subpath imports (`@spellkave/adventure-runtime/dm/creation`,
 * `.../stage`) so slug packages do not pull the whole tree. The TypeScript NPC
 * host runtime that once lived here is deleted (sk-jay0.1.55.60.8); the Rust
 * NPC host runs every seat.
 */

export {
	type AdventureDescriptor,
	adventureDescriptorPath,
	assertAdventureName,
	loadAdventureDescriptor,
	serializeHostedPlayerStage,
} from "./stage/index.ts";
