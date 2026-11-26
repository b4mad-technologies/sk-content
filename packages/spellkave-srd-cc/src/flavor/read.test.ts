// Content authors can publish reviewed flavour text with its author and model provenance.
// Runs offline against markdown strings and rejects missing review or model metadata.
// keep-file(K1): enumerate accepted provenance and refused metadata shapes.
import { describe, expect, it } from "vitest";
import { parseFlavorMarkdown } from "./read";

describe("parseFlavorMarkdown", () => {
	it("reads frontmatter and body", () => {
		const doc = parseFlavorMarkdown(
			`---
id: srd/class/barbarian
kind: class
locale: en
model: openai/gpt-5.6-terra
prompt_id: flavor
reviewed: true
---
Barbarians meet danger with raw nerve.
`,
			"test.md",
		);
		expect(doc.body).toBe("Barbarians meet danger with raw nerve.");
		expect(doc.id).toBe("srd/class/barbarian");
	});

	it("rejects unreviewed blurbs", () => {
		expect(() =>
			parseFlavorMarkdown(
				`---
id: srd/class/barbarian
kind: class
locale: en
model: openai/gpt-5.6-terra
prompt_id: flavor
reviewed: false
---
x
`,
				"test.md",
			),
		).toThrow(/reviewed must be true/);
	});

	it("reads an agent-session blurb's provider + author, no model required", () => {
		const doc = parseFlavorMarkdown(
			`---
id: srd/item/chest
kind: gear
locale: en
provider: agent-session
author: agent-session:claude-code (supervisor)
prompt_id: flavor-gear
reviewed: true
---
A sturdy chest.
`,
			"test.md",
		);
		expect(doc.model).toBeUndefined();
		expect(doc.provider).toBe("agent-session");
		expect(doc.author).toBe("agent-session:claude-code (supervisor)");
	});

	it("rejects a non-agent-session blurb with no model", () => {
		expect(() =>
			parseFlavorMarkdown(
				`---
id: srd/class/barbarian
kind: class
locale: en
prompt_id: flavor
reviewed: true
---
x
`,
				"test.md",
			),
		).toThrow(/missing model/);
	});
});
