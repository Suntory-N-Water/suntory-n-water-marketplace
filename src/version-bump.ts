const ROOT_DIR = new URL('..', import.meta.url).pathname;
const MARKETPLACE_PATH = `${ROOT_DIR}.claude-plugin/marketplace.json`;

const BUMP_TYPES = ['major', 'minor', 'patch'] as const;
type BumpType = (typeof BUMP_TYPES)[number];

type Plugin = {
  name: string;
  description: string;
  version: string;
  author: { name: string };
  source: string;
  category: string;
};

type Marketplace = {
  $schema: string;
  name: string;
  description: string;
  owner: { name: string };
  plugins: Plugin[];
};

function bumpVersion(current: string, type: BumpType): string {
  const parts = current.split('.').map(Number);
  const [major, minor, patch] = parts;

  if (
    parts.length !== 3 ||
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    parts.some(Number.isNaN)
  ) {
    throw new Error(`Invalid semver format: ${current}`);
  }

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
}

function printUsage(): void {
  console.log('Usage: bun run src/version-bump.ts <plugin-name> <bump-type>');
  console.log('');
  console.log('bump-type: major | minor | patch');
  console.log('');
  console.log('Examples:');
  console.log('  bun run src/version-bump.ts playwright-best-practices patch');
  console.log('  bun run src/version-bump.ts building-astro5-blogs minor');
}

async function main(): Promise<void> {
  const [pluginName, bumpType] = process.argv.slice(2);

  if (!pluginName || !bumpType) {
    printUsage();
    process.exit(1);
  }

  if (!BUMP_TYPES.includes(bumpType as BumpType)) {
    console.error(
      `Error: Invalid bump type "${bumpType}". Must be one of: ${BUMP_TYPES.join(', ')}`,
    );
    process.exit(1);
  }

  const file = Bun.file(MARKETPLACE_PATH);
  const marketplace: Marketplace = await file.json();

  const plugin = marketplace.plugins.find((p) => p.name === pluginName);

  if (!plugin) {
    console.error(`Error: Plugin "${pluginName}" not found.`);
    console.log('Available plugins:');
    for (const p of marketplace.plugins) {
      console.log(`  - ${p.name} (v${p.version})`);
    }
    process.exit(1);
  }

  const oldVersion = plugin.version;
  const newVersion = bumpVersion(oldVersion, bumpType as BumpType);
  plugin.version = newVersion;

  await Bun.write(file, `${JSON.stringify(marketplace, null, 2)}\n`);

  const pluginJsonPath = `${ROOT_DIR}${plugin.source.replace(/^\.\//, '')}/.claude-plugin/plugin.json`;
  const pluginJsonFile = Bun.file(pluginJsonPath);

  if (await pluginJsonFile.exists()) {
    const pluginJson: { version: string } = await pluginJsonFile.json();
    pluginJson.version = newVersion;
    await Bun.write(pluginJsonFile, `${JSON.stringify(pluginJson, null, 2)}\n`);
  }

  console.log(`${plugin.name}: v${oldVersion} -> v${newVersion}`);
}

main();
