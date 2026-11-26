import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parse_manifest_toml_to_json,
  render_manifest_json_to_toml,
  split_manifest_fragment,
  validate_manifest_toml,
} from "@spellkave/validate-wasm";
import { parse, stringify } from "smol-toml";

const packages = resolve(dirname(fileURLToPath(import.meta.url)), "../packages");

const srd = join(packages, "spellkave-srd-cc/fixtures");
const kavemouth = join(packages, "spellkave-adventure-kavemouth");
const playtest = join(packages, "spellkave-adventure-playtest-mini/fixtures");

const srdRoot = join(srd, "manifest.toml");
const dmRoot = join(srd, "dm/manifest.toml");
const roots = new Map([
  [srdRoot, []],
  [dmRoot, [srdRoot]],
  [join(kavemouth, "fixtures/adventure.manifest.toml"), [srdRoot, dmRoot]],
  [join(playtest, "manifest.toml"), [srdRoot]],
]);
const parseOptions = { integersAsBigInt: "asNeeded" };
const schemaDirective = "#:schema https://spellkave.dev/schema/world-manifest-1.0.0.json";

function localFile(root, path) {
  assert.equal(typeof path, "string", "path must be a string");
  const resolved = realpathSync(resolve(root, path));
  const fromRoot = relative(realpathSync(root), resolved);
  assert(fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`), `path escapes bundle: ${path}`);
  return resolved;
}

function fixtureFile(root, path) {
  return readFileSync(localFile(root, path), "utf8");
}

function checkRoundTrip(text, path) {
  const json = parse_manifest_toml_to_json(text);
  const reparsed = parse_manifest_toml_to_json(render_manifest_json_to_toml(json));
  assert(json === reparsed, `manifest round trip changed data: ${path}`);
}

const cache = join(srd, "../cache");
const { forks } = JSON.parse(fixtureFile(cache, "UPSTREAM.json"));
for (const { files } of Object.values(forks)) {
  for (const { path, sha256 } of files) {
    const actual = createHash("sha256").update(readFileSync(localFile(cache, path))).digest("hex");
    assert.equal(actual, sha256, `upstream cache changed: ${path}`);
  }
}

const bundles = new Map();
let failures = 0;
let artChecked = 0;
let mapsChecked = 0;
for (const [root, dependencies] of roots) {
  const text = readFileSync(root, "utf8");
  checkRoundTrip(text, root);
  const parsed = parse(text, parseOptions);
  const fragmentPaths = (parsed.include ?? []).map(({ path }) => path);
  assert.equal(new Set(fragmentPaths).size, fragmentPaths.length, `duplicate include: ${root}`);
  const fragments = fragmentPaths.map((path) => fixtureFile(dirname(root), path));
  const parts = fragments.map((source, index) => {
    const { rowToml } = JSON.parse(split_manifest_fragment(source));
    const fragment = `${schemaDirective}\nschema_version = "${parsed.schema_version}"\n${rowToml}`;
    checkRoundTrip(fragment, fragmentPaths[index]);
    return rowToml;
  });
  const combined = [text, ...parts].join("\n");
  const { schema_version, applyset, metadata, include, ...rows } = parse(combined, parseOptions);
  bundles.set(root, rows);
  const merged = { schema_version, applyset, metadata };
  for (const input of [...dependencies.map((dep) => bundles.get(dep)), rows]) {
    for (const [key, values] of Object.entries(input)) {
      assert(Array.isArray(values), `unexpected manifest field: ${key}`);
      (merged[key] ??= []).push(...values);
    }
  }
  const check = dependencies.length === 0
    ? combined
    : `${schemaDirective}\n${stringify(merged)}`;
  const diagnostics = JSON.parse(validate_manifest_toml(check));
  const fatal = diagnostics.filter(({ severity }) => severity === "fatal");
  const label = relative(packages, root);
  for (const source of [text, ...fragments]) {
    const data = parse(source, parseOptions);
    for (const layer of data.map_layers ?? []) {
      assert.equal(layer.asset_module, "kavemouth-maps", `map layer module in ${label}: ${layer.map_layer_id}`);
      const maps = join(kavemouth, "assets/kavemouth-maps");
      const image = readFileSync(localFile(maps, layer.asset_path));
      const sidecar = JSON.parse(readFileSync(localFile(maps, `${layer.asset_path}.json`), "utf8"));
      const hash = createHash("sha256").update(image).digest("hex");
      assert.equal(sidecar.sha256, hash, `map hash in ${label}: ${layer.asset_path}`);
      assert.equal(sidecar.provenance?.license, "CC-BY-4.0", `map licence in ${label}: ${layer.asset_path}`);
      assert(sidecar.prompt && sidecar.tool && sidecar.generated_at, `map prompt, tool and date in ${label}: ${layer.asset_path}`);
      const plan = readFileSync(join(packages, "..", sidecar.source_plan));
      assert.equal(
        createHash("sha256").update(plan).digest("hex"),
        sidecar.source_plan_sha256,
        `map was generated from another plan in ${label}: ${layer.asset_path}`,
      );
      // PNG IHDR: width and height are the two big-endian words after the 16-byte header.
      assert.equal(image.readUInt32BE(16), layer.image_width_px, `map width in ${label}: ${layer.asset_path}`);
      assert.equal(image.readUInt32BE(20), layer.image_height_px, `map height in ${label}: ${layer.asset_path}`);
      mapsChecked += 1;
    }
    for (const attachment of data.metadata_attachments ?? []) {
      if (!attachment.namespace?.endsWith(".art.image")) continue;
      const art = JSON.parse(attachment.payload_json);
      assert.equal(art.license, "CC-BY-4.0", `art licence in ${label}: ${art.path}`);
      const assets = join(attachment.bundle_id === "srd" ? srd : join(kavemouth, "fixtures"), "../assets");
      const bytes = readFileSync(localFile(assets, art.path));
      const hash = createHash("sha256").update(bytes).digest("hex");
      assert.equal(hash, art.hash, `art hash in ${label}: ${art.path}`);
      artChecked += 1;
    }
  }
  console.log(`${label}: ${fragments.length} includes, ${fatal.length} fatal, ${diagnostics.length - fatal.length} other diagnostics`);
  for (const { code, path, message } of fatal) console.error(`  ${code} ${path}: ${message}`);
  failures += fatal.length;
}

console.log(`art attachments: ${artChecked} checked (path, SHA-256, CC-BY-4.0)`);
console.log(`map layers: ${mapsChecked} checked (image, sidecar, plan, size, CC-BY-4.0)`);
if (failures) process.exitCode = 1;
