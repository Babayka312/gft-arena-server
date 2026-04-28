import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

await esbuild.build({
  entryPoints: [join(root, 'src/cards/bundleForServer.ts')],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  outfile: join(root, 'server/characterCardsData.mjs'),
});

await esbuild.build({
  entryPoints: [join(root, 'src/game/pvpRng.ts')],
  bundle: true,
  platform: 'neutral',
  format: 'esm',
  outfile: join(root, 'server/pvpRng.mjs'),
});
