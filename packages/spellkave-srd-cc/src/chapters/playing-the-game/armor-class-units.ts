import { BUNDLE_ID } from "./constants";
import { expectedAbilityModifier } from "./modifier-units";

/** Shared Armor Class fact owned by Playing the Game; equipment only modifies it. */
export const AC_ID = "ac";
export const AC_RESOURCE_ID = `${BUNDLE_ID}/${AC_ID}`;
export const AC_DISPLAY_NAME = "Armor Class";
export const AC_RESOURCE_MIN = 0;
export const AC_RESOURCE_MAX = 30;

/** Calculate the static unarmored seed authored for one entity definition. */
export function unarmoredBaseArmorClass(dexScore?: number): number {
	if (dexScore === undefined) return 10;
	return 10 + expectedAbilityModifier(dexScore);
}

export const AC_RESOURCE_INITIAL = unarmoredBaseArmorClass();

/** Canonical row used both by the central fixture and isolated modifier validation. */
export function acModifierTargetRow(): Record<string, unknown> {
	return {
		target_id: AC_RESOURCE_ID,
		bundle_id: BUNDLE_ID,
		shape: "Numeric",
		display_name: AC_DISPLAY_NAME,
		description:
			"Modder-defined Armor Class modifier axis — additive and replacement composition " +
			"for armor, cover, magic, and other effects.",
	};
}
