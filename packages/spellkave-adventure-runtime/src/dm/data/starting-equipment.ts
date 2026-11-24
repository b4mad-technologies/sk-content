/** Source-backed kit components. Definition resolution remains an author-target concern. */
import { classKitChoice } from "./class-choices.ts";

export interface StartingEquipmentComponent {
	/** Source spelling, retained for catalog resolution and useful diagnostics. */
	name: string;
	quantity: number;
}

export interface StartingEquipmentSelection {
	items: StartingEquipmentComponent[];
	goldPieces: number;
	sourceText: string;
}

export interface StartingEquipmentChoice {
	/** Exact component text is the stable binding between the menu and the kit. */
	sourceText: string;
	/** An equipment choice may reuse a previously selected tool proficiency. */
	usesToolProficiency: boolean;
}

function selectedKitOption(classSlug: string, letter: string) {
	const kit = classKitChoice(classSlug);
	const option = kit.options.find((candidate) => candidate.letter === letter);
	if (option === undefined) {
		throw new Error(`starting-equipment: ${classSlug} has no kit ${letter}.`);
	}
	return { kit, option };
}

function kitComponents(description: string): string[] {
	return description.split(",").map((raw) => raw.trim().replace(/^and\s+/i, ""));
}

/** Discover outstanding choices before confirmation, without materializing items. */
export function startingEquipmentChoices(
	classSlug: string,
	letter: string,
): StartingEquipmentChoice[] {
	const { option } = selectedKitOption(classSlug, letter);
	return kitComponents(option.description).flatMap((sourceText) =>
		/\b(?:your choice|chosen for)\b/i.test(sourceText)
			? [
					{
						sourceText,
						usesToolProficiency: /\bchosen for the tool proficiency\b/i.test(sourceText),
					},
				]
			: [],
	);
}

export interface EquipmentDefinition {
	entity_def_id: string;
	display_name: string;
}

function equipmentNameKey(name: string): string {
	// Source tables use "Lantern, Hooded" where pack prose says "Hooded Lantern".
	return name
		.trim()
		.replace(/^([^,]+),\s*([^,]+)$/, "$2 $1")
		.toLocaleLowerCase("en-US");
}

/** Convert a source count to catalog item units (e.g. 20 arrows = one pack). */
export function resolveEquipmentComponent(
	component: StartingEquipmentComponent,
	definitions: readonly EquipmentDefinition[],
): { definition: EquipmentDefinition; quantity: number } {
	const normalized = component.name.trim().toLocaleLowerCase("en-US");
	const packaged = definitions.filter(
		(definition) =>
			definition.display_name
				.replace(/\s*\(\d+\)$/, "")
				.trim()
				.toLocaleLowerCase("en-US") === normalized && /\(\d+\)$/.test(definition.display_name),
	);
	const direct = definitions.some(
		(definition) => definition.display_name.trim().toLocaleLowerCase("en-US") === normalized,
	);
	if (!direct && packaged.length > 0) {
		const definition = packaged[0];
		if (packaged.length !== 1 || definition === undefined) {
			throw new Error(`starting-equipment: ambiguous package for '${component.name}'.`);
		}
		const size = Number(/\((\d+)\)$/.exec(definition.display_name)?.[1]);
		if (!Number.isSafeInteger(size) || size < 1 || component.quantity % size !== 0) {
			throw new Error(
				`starting-equipment: cannot represent ${component.quantity} ${component.name} in catalog pack units.`,
			);
		}
		return { definition, quantity: component.quantity / size };
	}
	return {
		definition: resolveEquipmentDefinition(component.name, definitions),
		quantity: component.quantity,
	};
}

/** Match source singular/plural spelling without guessing definition IDs. */
export function resolveEquipmentDefinition(
	name: string,
	definitions: readonly EquipmentDefinition[],
): EquipmentDefinition {
	const normalized = equipmentNameKey(name);
	const exact = definitions.filter(
		(definition) => equipmentNameKey(definition.display_name) === normalized,
	);
	const matches =
		exact.length > 0
			? exact
			: definitions.filter((definition) => {
					const singular = equipmentNameKey(definition.display_name);
					return `${singular}${/(?:ch|sh|s|x|z)$/.test(singular) ? "es" : "s"}` === normalized;
				});
	const match = matches[0];
	if (matches.length !== 1 || match === undefined) {
		throw new Error(
			`starting-equipment: ${matches.length === 0 ? "missing" : "ambiguous"} definition for '${name}'.`,
		);
	}
	return match;
}

/**
 * Decode the selected Core Traits cell, never substitute another option.
 * An unresolved nested choice is not an item: the caller must collect it
 * before materializing the kit rather than silently choose for the player.
 */
export function startingEquipmentSelection(
	classSlug: string,
	letter: string,
	/** Caller validates membership in the authored choice catalog. No defaults. */
	choices: Readonly<Record<string, string>> = {},
): StartingEquipmentSelection {
	const { kit, option } = selectedKitOption(classSlug, letter);
	const requirements = startingEquipmentChoices(classSlug, letter);
	for (const key of Object.keys(choices)) {
		if (!requirements.some((requirement) => requirement.sourceText === key)) {
			throw new Error(`starting-equipment: unexpected choice for ${classSlug} ${letter}: ${key}`);
		}
	}
	const items: StartingEquipmentComponent[] = [];
	let goldPieces = 0;
	for (const raw of kitComponents(option.description)) {
		const component = raw;
		if (/\b(?:your choice|chosen for)\b/i.test(component)) {
			const chosen = choices[component]?.trim();
			if (!chosen || /\b(?:your choice|chosen for)\b/i.test(chosen)) {
				throw new Error(
					`starting-equipment: unresolved choice in ${classSlug} ${letter}: ${component}`,
				);
			}
			// A choice selects one physical item, never a quantity or currency
			// award. Do not split its display name: source instrument names
			// themselves contain commas ("Musical Instrument, Lute").
			if (/^\d+\s/.test(chosen)) {
				throw new Error(`starting-equipment: invalid chosen item: ${chosen}`);
			}
			items.push({ name: chosen, quantity: 1 });
			continue;
		}
		const gold = /^(\d+)\s+GP$/i.exec(component);
		if (gold !== null) {
			goldPieces += Number(gold[1]);
			continue;
		}
		const counted = /^(\d+)\s+(.+)$/.exec(component);
		const quantity = counted === null ? 1 : Number(counted[1]);
		const name = counted === null ? component : (counted[2] ?? "");
		if (name.length === 0 || !Number.isSafeInteger(quantity) || quantity < 1) {
			throw new Error(`starting-equipment: invalid component in ${classSlug} ${letter}: ${raw}`);
		}
		items.push({ name, quantity });
	}
	return { items, goldPieces, sourceText: kit.sourceText };
}
