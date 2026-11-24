// pattern: none — descriptive POI metadata attachments do not alter world behavior.
import type { VerbCall } from "@spellkave/adventure-runtime/dm/lib";
import { BUNDLE, GRAPHS, nodeId } from "./lib/ids.ts";

export interface AdventurePoiEntry {
	kind: "place_node" | "place_graph";
	ref: string;
	icon: string;
	category?: string;
	label?: string;
	badge?: string;
	color?: string;
}

/**
 * Public POI metadata attachments for elven-mini places.
 *
 * Driven by the 'maps.poi' metadata schema (ADR-0073 / ADR-0130).
 * Projects icon, category, label, and color onto nodes in the map's vector tiles.
 */
export function adventurePoi(): VerbCall[] {
	const entries: readonly AdventurePoiEntry[] = [
		// Crossroads (Region)
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.region, "crossroads"),
			icon: "portal",
			category: "transit",
			label: "Crossroads",
			color: "#a855f7",
		},
		// Hamlet Key Points
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.hamlet, "inn_front"),
			icon: "inn",
			category: "hospitality",
			label: "Mountain View Inn",
			color: "#f59e0b",
		},
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.hamlet, "well"),
			icon: "well",
			category: "water",
			label: "Old Well",
			color: "#0284c7",
		},
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.hamlet, "tomb_hill"),
			icon: "dungeon",
			category: "tomb",
			label: "Tomb Hill",
			color: "#dc2626",
		},
		// Wererat Nest (Well)
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.well, "wererat_nest"),
			icon: "skull",
			category: "danger",
			label: "Wererat Nest",
			color: "#b91c1c",
		},
		// Tomb Key Points
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.tomb, "entrance"),
			icon: "crypt",
			category: "dungeon",
			label: "Ironfold Tomb",
			color: "#dc2626",
		},
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.tomb, "pool"),
			icon: "tactical",
			category: "hazard",
			label: "Stagnant Pool",
			color: "#e11d48",
		},
		// Shrine
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.shrine, "altar"),
			icon: "temple",
			category: "shrine",
			label: "Sun & Moon Altar",
			color: "#eab308",
		},
		// Cursed Crypt
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.cursed_crypt, "entrance"),
			icon: "crypt",
			category: "dungeon",
			label: "Cursed Crypt",
			color: "#dc2626",
		},
		// Deep Tomb
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.deep_tomb, "steward_court"),
			icon: "dungeon",
			category: "tomb",
			label: "Pale Steward's Court",
			color: "#ef4444",
		},
		// Goblin Warren
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.goblin_warren, "entrance"),
			icon: "cave",
			category: "cavern",
			label: "Goblin Warren",
			color: "#78716c",
		},
		// Mine
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.mine, "adit"),
			icon: "cave",
			category: "mine",
			label: "Abandoned Mine",
			color: "#78716c",
		},
		// Mill
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.mill, "yard"),
			icon: "shop",
			category: "industry",
			label: "Old Mill",
			color: "#10b981",
		},
		// Forest Lodge
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.forest_lodge, "forest_path"),
			icon: "camp",
			category: "shelter",
			label: "Gamekeeper's Lodge",
			color: "#84cc16",
		},
		// Hobgoblin Camp
		{
			kind: "place_node",
			ref: nodeId(GRAPHS.hobgoblin_camp, "approach"),
			icon: "camp",
			category: "danger",
			label: "Hobgoblin Camp",
			color: "#ef4444",
		},
	];

	return [
		{
			toolName: "spellkave_set_metadata",
			label: "register-public-adventure-poi",
			params: {
				bundle: BUNDLE,
				target: "namespace",
				key: `${BUNDLE}.maps.poi`,
				value: {
					audience: "public",
					description:
						"Public point of interest presentation metadata (icon, category, color, badge, label).",
				},
			},
		},
		{
			toolName: "spellkave_set_metadata",
			label: "attach-adventure-poi",
			params: {
				bundle: BUNDLE,
				updates: entries.map((entry) => ({
					target: { kind: entry.kind, ref: entry.ref },
					key: `${BUNDLE}.maps.poi`,
					value: {
						icon: entry.icon,
						...(entry.category ? { category: entry.category } : {}),
						...(entry.label ? { label: entry.label } : {}),
						...(entry.badge ? { badge: entry.badge } : {}),
						...(entry.color ? { color: entry.color } : {}),
					},
				})),
			},
		},
	];
}
