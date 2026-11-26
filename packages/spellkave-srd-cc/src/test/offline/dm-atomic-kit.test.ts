import path from "node:path";
import { createLocalAuthorTarget } from "@spellkave/tool-node/authoring";
import { describe, expect, it } from "vitest";
import { authoredCreationKits } from "../../../../spellkave-adventure-runtime/src/author/dm/creation-kits.ts";

const target = createLocalAuthorTarget(path.resolve(import.meta.dirname, "../../../fixtures"));
describe("atomic authored creation kits", () => {
	it("authors a whole source-backed kit and durable latch in one consequence", () => {
		const kits = authoredCreationKits(target);
		const fighter = kits.find((kit) => kit.id.startsWith("dm/act/creation/kit/fighter/A/"));
		expect(fighter).toBeDefined();
		expect(fighter!.capability).toBe("frontier.transfer");
		expect(fighter!.predicate).toBe("target.stat('dm/creation/kit-granted') == 0");
		expect(fighter!.writes.some((write) => JSON.stringify(write).includes("InsertedItem:"))).toBe(
			true,
		);
		expect(fighter!.writes.at(-1)).toEqual({
			ModifyResource: {
				actor: "TargetActor",
				resource: "dm/creation/kit-granted",
				delta_source: "1 - target.stat('dm/creation/kit-granted')",
			},
		});
		expect(new Set(kits.map((kit) => kit.id)).size).toBe(kits.length);
		expect(authoredCreationKits(target)).toEqual(kits);
	});
});
