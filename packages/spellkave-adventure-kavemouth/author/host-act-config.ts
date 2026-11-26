// pattern: none — kavemouth host-act config (thin wiring)
/**
 * The kavemouth values every DM "host act" renderer is parametrised with
 * (kill XP, quest XP, loot, the companion-bond latch). The mechanism lives in
 * `@spellkave/adventure-runtime/dm/{host-act,xp,loot,companion-bond}`; this
 * file only names the story: bundle, the DM's entity key and persona name,
 * and the bundle header every runtime delta must prepend.
 *
 * DM seat ELEVATION is never read from here (ADR-0103): `dmEntityKey` only
 * names the holder of the may-do capabilities; the privilege stays an
 * operator-authored fixture row (`dm-npc.ts`).
 *
 * Leaf-ish module (lib/ids, lib/entity-keys, bundle-header only) so the
 * per-act author files can import it without cycling through `dm-npc.ts`.
 */
import type { HostActConfig } from "@spellkave/adventure-runtime/dm/host-act";
import { kavemouthBundleHeaderCall } from "./bundle-header.ts";
import { ALDWIN_ENTITY_KEY } from "./lib/entity-keys.ts";
import { BUNDLE } from "./lib/ids.ts";

export const KAVEMOUTH_HOST_ACT: HostActConfig = {
	bundle: BUNDLE,
	dmEntityKey: ALDWIN_ENTITY_KEY,
	personaName: "Aldwin",
	bundleHeader: kavemouthBundleHeaderCall,
};
