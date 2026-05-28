import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  AUTH_PROVIDERS,
  CUSTODY_PROVIDERS,
  DEFAULTS,
  SESSION_PROVIDERS,
  slugifyProjectName,
  type AuthProvider,
  type CustodyProvider,
  type ScaffoldSelections,
  type SessionProvider,
} from '@castrater/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../');

const EXCLUDED_RELATIVE_PATHS = new Set([
  'pnpm-lock.yaml',
  '.env',
  'packages/create-app',
]);

function getFlag(name: string) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : undefined;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

function assertEnum<T extends readonly string[]>(
  value: string | undefined,
  allowed: T,
  fallback: T[number],
  label: string
): T[number] {
  if (!value) {
    return fallback;
  }
  if (allowed.includes(value)) {
    return value as T[number];
  }
  throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
}

function buildSelections(): ScaffoldSelections & { outDir: string } {
  const projectName = getFlag('project-name') ?? 'castrater-generated-app';
  const outDir = getFlag('out-dir');
  if (!outDir) {
    throw new Error('--out-dir is required');
  }
  const invocationCwd = process.env['INIT_CWD'] ?? process.cwd();
  const resolvedOutDir = path.resolve(invocationCwd, outDir);

  if (
    resolvedOutDir === path.join(repoRoot, 'packages') ||
    resolvedOutDir.startsWith(`${path.join(repoRoot, 'packages')}${path.sep}`)
  ) {
    throw new Error(
      `Refusing to generate inside this scaffold repo's packages directory: ${resolvedOutDir}`
    );
  }

  const authProvider = assertEnum(
    getFlag('auth'),
    AUTH_PROVIDERS,
    DEFAULTS.AUTH_PROVIDER,
    'auth'
  ) as AuthProvider;
  const sessionProvider = assertEnum(
    getFlag('session'),
    SESSION_PROVIDERS,
    DEFAULTS.SESSION_PROVIDER,
    'session'
  ) as SessionProvider;
  const custodyProvider = assertEnum(
    getFlag('custody'),
    CUSTODY_PROVIDERS,
    DEFAULTS.CUSTODY_PROVIDER,
    'custody'
  ) as CustodyProvider;

  if (authProvider === 'passkey' && sessionProvider !== 'cookie') {
    throw new Error('passkey auth currently requires --session=cookie');
  }

  return {
    projectName,
    outDir: resolvedOutDir,
    authProvider,
    sessionProvider,
    custodyProvider,
  };
}

function listTrackedFiles() {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((relativePath) => {
      for (const excluded of EXCLUDED_RELATIVE_PATHS) {
        if (relativePath === excluded || relativePath.startsWith(`${excluded}/`)) {
          return false;
        }
      }
      return true;
    });
}

async function copyTrackedFiles(targetRoot: string) {
  const files = listTrackedFiles();
  for (const relativePath of files) {
    const source = path.join(repoRoot, relativePath);
    const target = path.join(targetRoot, relativePath);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }
}

async function rewriteRootPackageJson(targetRoot: string, projectName: string) {
  const packageJsonPath = path.join(targetRoot, 'package.json');
  const parsed = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
    name: string;
  };
  parsed.name = slugifyProjectName(projectName);
  await fs.writeFile(packageJsonPath, `${JSON.stringify(parsed, null, 2)}\n`);
}

async function writeSelectionsFile(
  targetRoot: string,
  selections: ScaffoldSelections
) {
  await fs.writeFile(
    path.join(targetRoot, 'scaffold.selections.json'),
    `${JSON.stringify(selections, null, 2)}\n`
  );
}

function replaceEnvLine(contents: string, key: string, value: string) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(contents)) {
    return contents.replace(pattern, `${key}=${value}`);
  }
  return `${contents.trimEnd()}\n${key}=${value}\n`;
}

async function rewriteEnvExample(
  targetRoot: string,
  selections: ScaffoldSelections
) {
  const envPath = path.join(targetRoot, 'infra/.env.example');
  let env = await fs.readFile(envPath, 'utf8');

  env = replaceEnvLine(env, 'AUTH_PROVIDER', selections.authProvider);
  env = replaceEnvLine(env, 'SESSION_PROVIDER', selections.sessionProvider);
  env = replaceEnvLine(env, 'CUSTODY_PROVIDER', selections.custodyProvider);
  env = replaceEnvLine(
    env,
    'WEBAUTHN_RP_NAME',
    selections.projectName
  );

  if (selections.custodyProvider !== 'quilibrium-sdk') {
    env = replaceEnvLine(env, 'QUILIBRIUM_APP_ID', '');
    env = replaceEnvLine(env, 'QUILIBRIUM_APP_SECRET', '');
  }

  await fs.writeFile(envPath, env);
}

async function rewriteReadme(
  targetRoot: string,
  selections: ScaffoldSelections
) {
  const readmePath = path.join(targetRoot, 'README.md');
  const readme = await fs.readFile(readmePath, 'utf8');
  const summary = [
    `# ${selections.projectName}`,
    '',
    'Generated from `castrater-app-kit`.',
    '',
    '## Selected Scaffold',
    '',
    `- auth: \`${selections.authProvider}\``,
    `- session: \`${selections.sessionProvider}\``,
    `- custody: \`${selections.custodyProvider}\``,
    '',
  ].join('\n');

  const next = readme.replace(/^# .*\n\n/, `${summary}`);
  await fs.writeFile(readmePath, next);
}

function printUsage() {
  console.log(`Usage:

pnpm scaffold:new -- \\
  --out-dir=../my-app \\
  --project-name="My App" \\
  --auth=passkey \\
  --session=cookie \\
  --custody=local

Options:
  --out-dir        Target directory for the generated app (required)
  --project-name   Human-readable app name
  --auth           ${AUTH_PROVIDERS.join(' | ')}
                   passkey = WebAuthn/passkey login
                   demo    = seeded demo user, no human auth ceremony
  --session        ${SESSION_PROVIDERS.join(' | ')}
                   cookie  = httpOnly server session
                   none    = no browser session persistence
  --custody        ${CUSTODY_PROVIDERS.join(' | ')}
                   local   = real local secp256k1 keys stored encrypted in Postgres
                   mock    = fake development signer
                   quilibrium-sdk = Quilibrium qKMS Node SDK provider

Valid combinations:
  passkey + cookie + local
  passkey + cookie + mock
  passkey + cookie + quilibrium-sdk
  demo + cookie + local|mock|quilibrium-sdk
  demo + none + local|mock|quilibrium-sdk

Examples:
  pnpm scaffold:new -- --out-dir=../wallet-app --project-name="Wallet App" --auth=passkey --session=cookie --custody=local
  pnpm scaffold:new -- --out-dir=../signer-lab --project-name="Signer Lab" --auth=demo --session=none --custody=local
`);
}

async function main() {
  if (hasFlag('help')) {
    printUsage();
    return;
  }

  const { outDir, ...selections } = buildSelections();

  await fs.mkdir(outDir, { recursive: true });
  const existing = await fs.readdir(outDir);
  if (existing.length > 0) {
    throw new Error(`Target directory is not empty: ${outDir}`);
  }

  await copyTrackedFiles(outDir);
  await rewriteRootPackageJson(outDir, selections.projectName);
  await writeSelectionsFile(outDir, selections);
  await rewriteEnvExample(outDir, selections);
  await rewriteReadme(outDir, selections);

  console.log(`Generated ${selections.projectName} at ${outDir}`);
  console.log('Next steps:');
  console.log(`  cd ${outDir}`);
  console.log('  pnpm install');
  console.log('  cp infra/.env.example .env');
  console.log('  pnpm db:migrate');
  console.log('  pnpm dev');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
