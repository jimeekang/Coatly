import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const projectRoot = resolve(currentDir, '..');
const outputPath = resolve(projectRoot, 'types', 'database.ts');
const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['supabase', 'gen', 'types', 'typescript', '--local'];

try {
  const output = execFileSync(command, args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, output, 'utf8');
  console.log(`Generated Supabase types at ${outputPath}`);
} catch (error) {
  const stderr =
    error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string'
      ? error.stderr.trim()
      : '';

  if (stderr) {
    console.error(stderr);
  }

  console.error(
    'Failed to run `supabase gen types typescript --local`. Make sure the Supabase local stack is running (Docker Desktop on Windows).'
  );
  process.exit(
    error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 1
  );
}
