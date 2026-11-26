import { afterEach, describe, expect, it } from "vitest";

import { sweep } from "./sweep";

describe("sweep (sk-fv0.3)", () => {
	const previous = process.env.SRD_FULL_SWEEP;
	afterEach(() => {
		if (previous === undefined) delete process.env.SRD_FULL_SWEEP;
		else process.env.SRD_FULL_SWEEP = previous;
	});

	it("returns first, middle, last when the list is long", () => {
		delete process.env.SRD_FULL_SWEEP;
		expect(sweep([1, 2, 3, 4, 5, 6, 7])).toEqual([1, 4, 7]);
	});

	it("returns the whole list when SRD_FULL_SWEEP=1", () => {
		process.env.SRD_FULL_SWEEP = "1";
		expect(sweep([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
	});
});
