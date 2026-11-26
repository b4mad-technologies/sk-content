// pattern: none — descriptive art attachments do not alter world behavior.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { SRD_BUNDLE_ID } from "@spellkave/adventure-runtime/srd-ids";
import { ALDWIN_ENTITY_KEY } from "./dm-npc.ts";
import { ADVENTURE_RATIONS_DEF_ID, ADVENTURE_TORCH_DEF_ID } from "./hero.ts";
import { BUNDLE } from "./lib/ids.ts";
import { INNKEEPER_ENTITY_KEY } from "./occupancy.ts";
import { ENCOUNTER_KEYS, STORYLINE_NPC_KEYS } from "./quests.ts";

type ArtSubject = readonly ["entity" | "entity_definition", string, string];

/**
 * Adventure associations, never Play widget/placement instructions.
 *
 * Named people attach to entity instances (they share SRD creature defs).
 * Catalog items and creature defs attach to entity_definition so later
 * instances inherit the same public image. Renn is reference-only.
 */
export function adventureArt(): VerbCall[] {
	const subjects: readonly ArtSubject[] = [
		["entity", ALDWIN_ENTITY_KEY, "characters/aldwin-ledger-keeper.webp"],
		["entity", INNKEEPER_ENTITY_KEY, "characters/mira-innkeeper.webp"],
		["entity", STORYLINE_NPC_KEYS.caddoc, "characters/brother-caddoc.webp"],
		["entity", STORYLINE_NPC_KEYS.ysolde, "person/captain-ysolde-farwind.webp"],
		["entity", STORYLINE_NPC_KEYS.tamsin, "person/old-tamsin.webp"],
		["entity", STORYLINE_NPC_KEYS.jory, "person/jory-millwright.webp"],
		["entity", STORYLINE_NPC_KEYS.hesper, "person/hesper-of-the-lodge.webp"],
		["entity", STORYLINE_NPC_KEYS.vessk, "person/vessk.webp"],
		["entity", ENCOUNTER_KEYS.sisterMaelis, "creature/sister-maelis.webp"],
		["entity", ENCOUNTER_KEYS.ghorza, "creature/warcaptain-ghorza.webp"],
		["entity", ENCOUNTER_KEYS.grubnash, "creature/grubnash.webp"],
		["entity", ENCOUNTER_KEYS.ulda, "creature/ulda.webp"],
		["entity", `${BUNDLE}/adventure/encounter/durgan_ironfold_1`, "creature/durgan-ironfold.webp"],
		["entity", ENCOUNTER_KEYS.paleSteward, "creature/pale-steward.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/giant-rat`, "characters/cellar-rat.webp"],
		[
			"entity_definition",
			`${SRD_BUNDLE_ID}/creature/swarm-of-rats`,
			"characters/cellar-rat-swarm.webp",
		],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/wolf`, "creature/road-wolf.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/stirge`, "creature/stirge.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/cultist`, "creature/mill-cultist.webp"],
		[
			"entity_definition",
			`${SRD_BUNDLE_ID}/creature/hobgoblin-warrior`,
			"creature/hobgoblin-warrior.webp",
		],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/worg`, "creature/worg.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/giant-spider`, "creature/giant-spider.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/owlbear`, "creature/owlbear.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/goblin-minion`, "creature/goblin-minion.webp"],
		[
			"entity_definition",
			`${SRD_BUNDLE_ID}/creature/goblin-warrior`,
			"creature/goblin-warrior.webp",
		],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/giant-frog`, "creature/giant-frog.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/will-o-wisp`, "creature/will-o-wisp.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/skeleton`, "creature/skeleton.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/ghoul`, "creature/ghoul.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/ghast`, "creature/ghast.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/wight`, "creature/bound-wight.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/shadow`, "creature/shadow.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/specter`, "creature/shrine-specter.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/wererat`, "creature/wererat.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/gray-ooze`, "creature/gray-ooze.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/zombie`, "creature/zombie.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/creature/ogre-zombie`, "creature/ogre-zombie.webp"],
		["entity_definition", ADVENTURE_TORCH_DEF_ID, "items/torch.webp"],
		["entity_definition", ADVENTURE_RATIONS_DEF_ID, "items/rations.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/item/rope`, "items/rope.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/item/waterskin`, "items/waterskin.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/weapon/shortsword`, "items/shortsword.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/armor/shield`, "items/shield.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/item/potion-of-healing`, "items/healing-potion.webp"],
		["entity_definition", `${SRD_BUNDLE_ID}/item/lantern-hooded`, "items/lantern.webp"],
		["entity_definition", `${BUNDLE}/adventure/item/moonpetal`, "item/moonpetal.webp"],
		["entity_definition", `${BUNDLE}/adventure/item/cult_relic`, "item/cult-relic.webp"],
		["entity_definition", `${BUNDLE}/adventure/item/tomb_key`, "item/ironfold-tomb-key.webp"],
		[
			"entity_definition",
			`${SRD_BUNDLE_ID}/magic_item/longsword-plus-1`,
			"item/longsword-plus-1.webp",
		],
	];
	return [
		{
			toolName: "spellkave_set_metadata",
			label: "register-public-adventure-art",
			params: {
				bundle: BUNDLE,
				target: "namespace",
				key: `${BUNDLE}.art.image`,
				value: {
					audience: "public",
					description:
						"Public image reference, SHA-256 content hash and license for an authored subject; consumers choose presentation.",
				},
			},
		},
		{
			toolName: "spellkave_set_metadata",
			label: "attach-adventure-art",
			params: {
				bundle: BUNDLE,
				updates: subjects.map(([kind, ref, relative]) => ({
					target: { kind, ref },
					key: `${BUNDLE}.art.image`,
					value: {
						path: `kavemouth-art/${relative}`,
						hash: createHash("sha256")
							.update(
								readFileSync(new URL(`../assets/kavemouth-art/${relative}`, import.meta.url)),
							)
							.digest("hex"),
						license: "CC-BY-4.0",
					},
				})),
			},
		},
	];
}
