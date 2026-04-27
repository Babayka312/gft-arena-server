import { access, copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(rootDir, 'data');
const backupsDir = path.join(rootDir, 'backups');

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectJsonFiles(sourceDir) {
  if (!(await pathExists(sourceDir))) return [];

  const entries = await readdir(sourceDir);
  const files = [];
  for (const entry of entries) {
    if (!entry.endsWith('.json') && !entry.endsWith('.jsonl')) continue;
    const fullPath = path.join(sourceDir, entry);
    const info = await stat(fullPath);
    if (info.isFile()) files.push(entry);
  }
  return files;
}

export async function backupData(reason = 'manual') {
  const files = await collectJsonFiles(dataDir);
  const backupName = `data-${formatTimestamp()}`;
  const backupDir = path.join(backupsDir, backupName);

  await mkdir(backupDir, { recursive: true });
  for (const file of files) {
    await copyFile(path.join(dataDir, file), path.join(backupDir, file));
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    reason,
    source: path.relative(rootDir, dataDir),
    files,
  };
  await writeFile(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Backup created: ${path.relative(rootDir, backupDir)}`);
  console.log(files.length > 0 ? `Copied files: ${files.join(', ')}` : 'No data/*.json files found; manifest only.');
  return backupDir;
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? '')) {
  await backupData(process.argv[2] ?? 'manual');
}
