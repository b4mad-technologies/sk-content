import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packages = join(root, "packages");
const srd = join(packages, "spellkave-srd-cc");
const kavemouth = join(packages, "spellkave-adventure-kavemouth");
const srdNotice = readFileSync(join(srd, "cache/NOTICE.md"), "utf8");
const srdArt = readFileSync(join(srd, "assets/srd-art/LICENSE"), "utf8");
const kavemouthArt = readFileSync(join(kavemouth, "assets/kavemouth-art/LICENSE"), "utf8");
const kavemouthMaps = readFileSync(join(kavemouth, "assets/kavemouth-maps/LICENSE"), "utf8");
const license = readFileSync(join(root, "LICENSE.md"), "utf8");

const outputs = new Map([
  ["srd", [srd, [srdNotice, srdArt]]],
  ["kavemouth", [kavemouth, [srdNotice, srdArt, kavemouthArt, kavemouthMaps]]],
]);

for (const name of process.argv.slice(2)) {
  const entry = outputs.get(name);
  if (entry === undefined) throw new Error(`Unknown content package: ${name}`);
  const [packageRoot, notices] = entry;
  const output = join(packageRoot, "dist/compendium");
  const licenseDir = join(output, "LICENSES");
  mkdirSync(licenseDir, { recursive: true });
  copyFileSync(
    join(root, "LICENSES/PolyForm-Shield-1.0.0.md"),
    join(licenseDir, "PolyForm-Shield-1.0.0.md"),
  );
  copyFileSync(join(srd, "cache/MARKDOWN-LICENSE.md"), join(output, "MARKDOWN-LICENSE.md"));
  writeFileSync(join(output, "NOTICE.md"), notices.join("\n"));
  writeFileSync(join(output, "LICENSE.md"), license);
}
