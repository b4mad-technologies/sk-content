import type { VerbCall } from "../verb-runner";
import {
	CHECK_ACTION_CALLS,
	CHECK_DEFINITION_CALLS,
	CHECK_TARGET_CALLS,
} from "./proof-scene/calls/checks";
import { COMBAT_CALLS, COMBAT_DEFINITION_CALLS } from "./proof-scene/calls/combat";
import { COMBAT_ARENA_CALLS } from "./proof-scene/calls/combat-arena";
import { IDENTITY_DEFINITION_CALLS, IDENTITY_SPAWN_CALLS } from "./proof-scene/calls/identity";
import { INITIATIVE_CALLS } from "./proof-scene/calls/initiative";
import {
	OBJECT_INTERACTION_DEFINITION_CALLS,
	OBJECT_INTERACTION_SCENE_CALLS,
} from "./proof-scene/calls/object-interaction";
import { SHARED_CALLS } from "./proof-scene/calls/shared";

export const PROOF_CALLS: readonly VerbCall[] = [
	...SHARED_CALLS,
	...OBJECT_INTERACTION_DEFINITION_CALLS,
	...CHECK_DEFINITION_CALLS,
	...COMBAT_DEFINITION_CALLS,
	...IDENTITY_DEFINITION_CALLS,
	...CHECK_ACTION_CALLS,
	...IDENTITY_SPAWN_CALLS,
	...OBJECT_INTERACTION_SCENE_CALLS,
	...CHECK_TARGET_CALLS,
	...COMBAT_CALLS,
	...INITIATIVE_CALLS,
	...COMBAT_ARENA_CALLS,
];
