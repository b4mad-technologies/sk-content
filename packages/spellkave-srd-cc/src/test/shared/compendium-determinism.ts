import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXTURES_DIR } from "../../export/from-fixtures";
import { renderCompendiumExport } from "../../export/render-export";

// Exercise multiple chapters and entries, resource/entity ownership, cross-links,
// tags, art/text optional fields, all source-pointer forms, and sorted JSON keys.
// Read the real generated fragments rather than maintain a parallel TOML fixture.
const DETERMINISM_FIXTURES = [
	"base/spells/cantrips/fire-bolt.toml",
	"base/spells/level-1/magic-missile.toml",
	"base/monsters/giant-spider.toml",
	"base/monsters/ancient-brass-dragon.toml",
	"base/classes/fighter.toml",
	"base/character-origins/species.toml",
	"base/character-origins/backgrounds.toml",
	"base/character-origins/traits.toml",
	"base/playing-the-game/abilities.toml",
	"base/equipment/weapons/longsword.toml",
	"base/equipment/weapons/dagger.toml",
	"base/equipment/armor/chain-mail.toml",
	"base/equipment/tools/thieves-tools.toml",
	"base/equipment/gear/gold-piece.toml",
	"base/feats/alert.toml",
	"base/magic-items/wand/wand-of-magic-missiles.toml",
	"base/magic-items/wondrous-item/bag-of-holding.toml",
	"base/playing-the-game/srd-art.toml",
	"base/equipment/gear/airship.toml",
	"base/equipment/weapon-tag-values.toml",
] as const;

export function renderDeterminismFixture() {
	const root = FIXTURES_DIR;
	const manifest = readFileSync(join(root, "manifest.toml"), "utf8");
	const files = Object.fromEntries(
		DETERMINISM_FIXTURES.map((path) => [path, readFileSync(join(root, path), "utf8")]),
	);
	return renderCompendiumExport(manifest, files);
}
