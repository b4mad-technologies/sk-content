/**
 * // pattern: bundle-movement-default
 *
 * Old dwarven mine — maps 36+219. Indoor child of region.
 */
import { GRAPHS } from "./lib/ids.ts";
import { MINE_MAP, MINE_PINS } from "./lib/mine-alignment.ts";
import { footprintFromCells, type GraphSlice, placeGraph } from "./lib/place.ts";

const NODE_DESCRIPTIONS: Record<string, string> = {
	adit: "The mine adit cut into the hillside, timber props dark with age.",
	forecourt: "A worked forecourt where carts once turned, rails rusted into the floor.",
	skeleton_gallery: "A long gallery lined with empty niches — bones have walked free.",
	crosscut: "A crosscut tunnel branching left and right into darker work.",
	ghoul_den: "A stinking side den where ghouls have dragged their meals.",
	shaft: "A vertical shaft dropping to the lower works, a ladder half-missing.",
	lower_hall: "The lower hall under the shaft, colder and quieter than above.",
	durgan_crypt: "A crypt-chamber where Durgan Ironfold waits in cursed armour.",
	key_vault: "A small vault-room off Durgan's crypt, the tomb key's last home.",
};

export function mine(): GraphSlice {
	return placeGraph("mine", {
		graph: GRAPHS.mine,
		substrate: "indoor",
		display_name: "Mine",
		description:
			"An old dwarven mine on the north pass — galleries of undead and a wight who still keeps the key.",
		provenance: {
			template: "Elven Tower maps 36 + 219",
			composition: "Indoor child of region; multi-z.",
		},
		parent_graph_id: GRAPHS.region,
		metres_per_unit: MINE_MAP.grid_distance_m,
		bearing: 0,
		nodes: MINE_PINS.map((p) => ({
			local: p.local,
			name: p.name,
			x: p.x,
			y: p.y,
			elevation: p.elevation,
			description: NODE_DESCRIPTIONS[p.local],
			...footprintFromCells(p.footprint, MINE_MAP.grid_distance_m, MINE_MAP.vertical_half_extent_m),
		})),
		edgeLocals: [
			["adit", "forecourt"],
			["forecourt", "skeleton_gallery"],
			["skeleton_gallery", "crosscut"],
			["crosscut", "ghoul_den"],
			["crosscut", "shaft"],
			["shaft", "lower_hall"],
			["lower_hall", "durgan_crypt"],
			["durgan_crypt", "key_vault"],
		],
	});
}
