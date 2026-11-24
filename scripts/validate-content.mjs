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
const elven = join(packages, "spellkave-adventure-elven-mini");
const playtest = join(packages, "spellkave-adventure-playtest-mini/fixtures");

const srdRoot = join(srd, "manifest.toml");
const dmRoot = join(srd, "dm/manifest.toml");
const roots = new Map([
  [srdRoot, []],
  [dmRoot, [srdRoot]],
  [join(elven, "fixtures/adventure.manifest.toml"), [srdRoot, dmRoot]],
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
      if (layer.asset_module !== "ccc3-maps") continue;
      localFile(join(elven, "assets/ccc3-maps"), layer.asset_path);
    }
    for (const attachment of data.metadata_attachments ?? []) {
      assert(!attachment.namespace?.endsWith(".art.image"), `held sprite reference in ${label}`);
    }
  }
  console.log(`${label}: ${fragments.length} includes, ${fatal.length} fatal, ${diagnostics.length - fatal.length} other diagnostics`);
  for (const { code, path, message } of fatal) console.error(`  ${code} ${path}: ${message}`);
  failures += fatal.length;
}

if (failures) process.exitCode = 1;
