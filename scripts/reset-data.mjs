import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { backupData } from './backup-data.mjs';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');

const confirmed = process.argv.includes('--yes');
if (!confirmed) {
  console.error('Reset cancelled. Run: npm run data:reset -- --yes');
  process.exit(1);
}

async function removeJsonFiles(sourceDir) {
  await mkdir(sourceDir, { recursive: true });
  const entries = await readdir(sourceDir);
  const jsonFiles = entries.filter(entry => entry.endsWith('.json') || entry.endsWith('.jsonl'));

  for (const file of jsonFiles) {
    await rm(path.join(sourceDir, file), { force: true });
  }

  return jsonFiles;
}

await backupData('pre-reset');
const removedFiles = await removeJsonFiles(dataDir);

await writeFile(
  path.join(dataDir, '.gitkeep'),
  'Runtime beta data lives here. JSON files are ignored by git.\n',
  'utf8',
);

console.log(removedFiles.length > 0 ? `Reset complete. Removed: ${removedFiles.join(', ')}` : 'Reset complete. No data/*.json files existed.');
