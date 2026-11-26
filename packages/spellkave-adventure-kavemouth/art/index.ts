/**
 * Kavemouth adventure art: pixel sprites for items, people and creatures of the Elven
 * Mini fixture, generated with PixelLab (blueprints in
 * .impeccable/mocks/pixellab/srd, provenance sidecars beside each file).
 * UI-lab imports this catalog at build time. Play uses the adventure OCI
 * asset route; neither consumer calls PixelLab at runtime.
 */
import aldwinUrl from "../assets/kavemouth-art/characters/aldwin-ledger-keeper.webp";
import caddocUrl from "../assets/kavemouth-art/characters/brother-caddoc.webp";
import ratUrl from "../assets/kavemouth-art/characters/cellar-rat.webp";
import ratSwarmUrl from "../assets/kavemouth-art/characters/cellar-rat-swarm.webp";
import miraUrl from "../assets/kavemouth-art/characters/mira-innkeeper.webp";
import rennUrl from "../assets/kavemouth-art/characters/renn-roadwarden.webp";
import healingPotionUrl from "../assets/kavemouth-art/items/healing-potion.webp";
import lanternUrl from "../assets/kavemouth-art/items/lantern.webp";
import rationsUrl from "../assets/kavemouth-art/items/rations.webp";
import ropeUrl from "../assets/kavemouth-art/items/rope.webp";
import shieldUrl from "../assets/kavemouth-art/items/shield.webp";
import shortswordUrl from "../assets/kavemouth-art/items/shortsword.webp";
import torchUrl from "../assets/kavemouth-art/items/torch.webp";
import waterskinUrl from "../assets/kavemouth-art/items/waterskin.webp";

export type AdventureArtEntry = {
	id: string;
	name: string;
	kind: "item" | "person" | "creature";
	url: string;
	/** Native sprite size in pixels; render at integer multiples for crisp pixels. */
	size: 64 | 96;
};

export const itemArt: readonly AdventureArtEntry[] = [
	{ id: "torch", name: "Torch", kind: "item", url: torchUrl, size: 64 },
	{ id: "rations", name: "Rations", kind: "item", url: rationsUrl, size: 64 },
	{ id: "rope", name: "Rope", kind: "item", url: ropeUrl, size: 64 },
	{ id: "waterskin", name: "Waterskin", kind: "item", url: waterskinUrl, size: 64 },
	{ id: "shortsword", name: "Shortsword", kind: "item", url: shortswordUrl, size: 64 },
	{ id: "shield", name: "Shield", kind: "item", url: shieldUrl, size: 64 },
	{ id: "healing-potion", name: "Healing potion", kind: "item", url: healingPotionUrl, size: 64 },
	{ id: "lantern", name: "Lantern", kind: "item", url: lanternUrl, size: 64 },
];

export const characterArt: readonly AdventureArtEntry[] = [
	{ id: "renn-roadwarden", name: "Renn the Roadwarden", kind: "person", url: rennUrl, size: 96 },
	{ id: "mira-innkeeper", name: "Mira, innkeeper", kind: "person", url: miraUrl, size: 96 },
	{
		id: "aldwin-ledger-keeper",
		name: "Aldwin, keeper of the hearth-ledger",
		kind: "person",
		url: aldwinUrl,
		size: 96,
	},
	{ id: "brother-caddoc", name: "Brother Caddoc", kind: "person", url: caddocUrl, size: 96 },
	{ id: "cellar-rat", name: "Cellar rat", kind: "creature", url: ratUrl, size: 96 },
	{
		id: "cellar-rat-swarm",
		name: "Cellar rat swarm",
		kind: "creature",
		url: ratSwarmUrl,
		size: 96,
	},
];

export const artById: Readonly<Record<string, AdventureArtEntry>> = Object.fromEntries(
	[...itemArt, ...characterArt].map((entry) => [entry.id, entry]),
);
