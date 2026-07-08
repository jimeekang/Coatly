/**
 * Static import-graph boundary checker for the DDD module architecture.
 *
 * This is a real analyzer (not a string grep): it walks every `.ts`/`.tsx`
 * file under the enforced roots, parses its `import` / `export ... from`
 * statements, resolves each specifier (both the `@/*` path alias and relative
 * `./` / `../` paths) to an on-disk file, classifies both endpoints into a
 * (top-level dir, module, layer) zone, and reports every edge that violates the
 * DDD layer import matrix. It also builds the module-level runtime dependency
 * graph and detects cross-module cycles.
 *
 * Only `node:fs` / `node:path` are used so it runs in the default vitest node
 * runtime with no extra dependencies.
 *
 * Enforcement principle: the checker reasons about the *runtime* import graph.
 * `import type` (and inline all-`type` named imports) are erased by the
 * compiler, carry no runtime coupling, and are therefore the sanctioned escape
 * hatch (e.g. a UI layer may reference another module's domain *types*). Test
 * files (`*.test.ts` / `*.test.tsx`) are the composition root for their unit —
 * they legitimately wire real implementations together — so they are exempt
 * from the cross-boundary matrix and from the module cycle graph.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTS = ['.ts', '.tsx'] as const;

/** Top-level directories that participate in the boundary graph. */
export const ENFORCED_ROOTS = [
  'app',
  'components',
  'lib',
  'modules',
  'utils',
  'types',
  'hooks',
  'config',
] as const;

/** Shared kernel / design system — must never depend on features or routes. */
export const SHARED_TOPS = new Set([
  'components',
  'lib',
  'utils',
  'types',
  'hooks',
  'config',
]);

export const MODULE_LAYERS = ['domain', 'application', 'infrastructure', 'ui'] as const;
export type ModuleLayer = (typeof MODULE_LAYERS)[number];

/**
 * External packages that make a domain file impure (IO / framework / rendering).
 * Domain must contain pure types and rules only.
 */
const IMPURE_EXTERNAL = [
  /^next(\/|$)/,
  /^@supabase\//,
  /^stripe$/,
  /^resend$/,
  /^@react-pdf\//,
  /^react-dom(\/|$)/,
  /^googleapis(\/|$)/,
  /^google-auth-library(\/|$)/,
  /^node:/,
  /^fs$/,
  /^fs\//,
];

export interface Violation {
  readonly rule: string;
  readonly file: string; // repo-relative, posix
  readonly line: number;
  readonly spec: string;
  readonly detail: string;
}

export interface ModuleCycle {
  readonly modules: readonly string[]; // sorted, canonical membership
  readonly path: readonly string[]; // human-readable traversal
  readonly key: string; // sorted members joined with '|'
}

export interface BoundaryReport {
  readonly root: string;
  readonly fileCount: number;
  readonly violations: Violation[];
  readonly cycles: ModuleCycle[];
  readonly moduleGraph: Record<string, string[]>;
  readonly moduleDirs: string[];
  readonly manifestNames: string[];
}

/** Human-readable descriptions for each enforced rule (used in messages). */
export const RULE_DESCRIPTIONS: Record<string, string> = {
  'shared-no-feature':
    'shared kernel (components/lib/utils/types/hooks/config) must not import feature modules or app routes',
  'module-no-app': 'feature modules must not import app/ (routes are the composition layer, not a dependency)',
  'domain-impure-external': 'domain must stay pure — no IO/framework/rendering packages',
  'domain-no-shared-io': 'domain must not import components/ or lib/* (only utils/, types/, config/, own+other domain)',
  'domain-no-own-nondomain': 'domain must not import its own module application/infrastructure/ui',
  'domain-no-cross-nondomain': "domain must not import another module's application/infrastructure/ui",
  'infra-no-components': 'infrastructure must not import the components/ design system',
  'infra-no-cross-module': 'infrastructure may only import its own domain plus provider packages/utils, never another module',
  'infra-no-own-app-ui': 'infrastructure must not import its own module application/ui',
  'application-no-components': 'application must not import the components/ design system',
  'application-no-cross-ui-infra': "application must not import another module's ui or infrastructure (use its application/domain)",
  'ui-no-cross-runtime':
    'ui must not runtime-import another module (inject via props/callbacks; only `import type` of another module domain is allowed)',
};

interface Zone {
  top: string; // 'app' | 'components' | 'modules' | 'modules-root' | ...
  mod?: string;
  layer?: ModuleLayer | 'root';
  rel: string;
}

function findRoot(explicit?: string): string {
  if (explicit) return path.resolve(explicit);
  const here = path.dirname(fileURLToPath(import.meta.url)); // <root>/modules
  const root = path.resolve(here, '..');
  return root;
}

function walk(dir: string, acc: string[]): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.next-dev') continue;
      walk(full, acc);
    } else if (EXTS.some((ext) => entry.name.endsWith(ext))) {
      acc.push(path.resolve(full));
    }
  }
  return acc;
}

function toPosix(rel: string): string {
  return rel.split(path.sep).join('/');
}

function isTestFile(rel: string): boolean {
  return /\.test\.tsx?$/.test(rel);
}

/**
 * Blank out comments while preserving byte offsets and newlines so that import
 * line numbers stay exact and specifiers inside comments are not matched.
 */
function blankComments(src: string): string {
  const out = src.split('');
  const blockRe = /\/\*[\s\S]*?\*\//g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(src))) {
    for (let i = m.index; i < m.index + m[0].length; i += 1) {
      if (out[i] !== '\n') out[i] = ' ';
    }
  }
  const joined = out.join('');
  const lineRe = /\/\/[^\n]*/g;
  while ((m = lineRe.exec(joined))) {
    for (let i = m.index; i < m.index + m[0].length; i += 1) out[i] = ' ';
  }
  return out.join('');
}

interface ParsedImport {
  spec: string;
  typeOnly: boolean;
  line: number;
}

/**
 * True when an import statement is entirely erased at runtime: either
 * `import type ...` / `export type ...`, or a named-only import where every
 * specifier is individually `type`-prefixed (no default/namespace binding).
 */
function clauseIsTypeOnly(clause: string): boolean {
  const c = clause.trim();
  if (/^type\b/.test(c)) return true;
  const brace = c.match(/^\{([\s\S]*)\}$/);
  if (!brace) return false;
  const specs = brace[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (specs.length === 0) return false;
  return specs.every((s) => /^type\b/.test(s));
}

function lineAt(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i += 1) {
    if (src[i] === '\n') line += 1;
  }
  return line;
}

function parseImports(content: string): ParsedImport[] {
  const src = blankComments(content);
  const results: ParsedImport[] = [];

  const fromRe = /\b(?:import|export)\b([\s\S]*?)\bfrom\s*['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(src))) {
    results.push({ spec: m[2], typeOnly: clauseIsTypeOnly(m[1]), line: lineAt(src, m.index) });
  }

  const sideEffectRe = /\bimport\s*['"]([^'"]+)['"]/g;
  while ((m = sideEffectRe.exec(src))) {
    results.push({ spec: m[1], typeOnly: false, line: lineAt(src, m.index) });
  }

  const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((m = dynamicRe.exec(src))) {
    results.push({ spec: m[1], typeOnly: false, line: lineAt(src, m.index) });
  }

  return results;
}

export function resolveSpecifier(root: string, fromFile: string, spec: string, fileSet: Set<string>): string | null {
  let base: string;
  if (spec.startsWith('@/')) {
    base = path.join(root, spec.slice(2));
  } else if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null; // external package
  }

  const candidates: string[] = [];
  if (EXTS.some((ext) => base.endsWith(ext))) candidates.push(base);
  for (const ext of EXTS) candidates.push(base + ext);
  for (const ext of EXTS) candidates.push(path.join(base, `index${ext}`));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (fileSet.has(resolved)) return resolved;
  }
  return null;
}

function classify(root: string, abs: string, moduleDirs: ReadonlySet<string>): Zone {
  const rel = toPosix(path.relative(root, abs));
  const parts = rel.split('/');
  const top = parts[0];
  if (top === 'modules') {
    const second = parts[1] ?? '';
    const isDirSegment = parts.length >= 3 && !second.endsWith('.ts') && !second.endsWith('.tsx');
    if (isDirSegment) {
      const layerSeg = parts[2] as ModuleLayer;
      const layer = (MODULE_LAYERS as readonly string[]).includes(layerSeg) ? layerSeg : 'root';
      return { top, mod: second, layer, rel };
    }
    // A file directly under modules/ whose basename matches a feature-module
    // directory is that module's public barrel. The subdir layout
    // (modules/<name>/index.ts) is caught by the branch above; a flat
    // modules/<name>.ts barrel lands here and must be attributed to the module
    // so a bare `@/modules/<name>` import is scored as a cross-module edge, not
    // silently absorbed into the neutral registry.
    if (parts.length === 2) {
      const base = second.replace(/\.tsx?$/, '');
      if (moduleDirs.has(base)) {
        return { top, mod: base, layer: 'root', rel };
      }
    }
    // Genuine registry files (modules/index.ts, module-manifest.ts, this checker,
    // the boundary test) are the module registry, not a feature module.
    return { top: 'modules-root', rel };
  }
  return { top, rel };
}

function listModuleDirs(root: string): string[] {
  const modulesDir = path.join(root, 'modules');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(modulesDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

function parseManifestNames(root: string): string[] {
  const manifestPath = path.join(root, 'modules', 'module-manifest.ts');
  let content: string;
  try {
    content = fs.readFileSync(manifestPath, 'utf8');
  } catch {
    return [];
  }
  // Extract the string-literal members of the FeatureModuleName union.
  const unionMatch = content.match(/FeatureModuleName\s*=([\s\S]*?);/);
  const scope = unionMatch ? unionMatch[1] : content;
  const names = new Set<string>();
  const re = /['"]([a-z][a-z0-9-]*)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(scope))) names.add(m[1]);
  return [...names].sort();
}

export function analyzeBoundaries(explicitRoot?: string): BoundaryReport {
  const root = findRoot(explicitRoot);

  const moduleDirNames = listModuleDirs(root);
  const moduleDirSet = new Set(moduleDirNames);

  const files: string[] = [];
  for (const dir of ENFORCED_ROOTS) walk(path.join(root, dir), files);
  const fileSet = new Set(files);

  const violations: Violation[] = [];
  const add = (rule: string, from: Zone, imp: ParsedImport, detail: string) => {
    violations.push({ rule, file: from.rel, line: imp.line, spec: imp.spec, detail });
  };

  // module -> set of modules it runtime-depends on (non-test, non-type edges)
  const graph = new Map<string, Set<string>>();

  for (const abs of files) {
    const from = classify(root, abs, moduleDirSet);
    const content = fs.readFileSync(abs, 'utf8');
    const imports = parseImports(content);
    const isTest = isTestFile(from.rel);

    for (const imp of imports) {
      const target = resolveSpecifier(root, abs, imp.spec, fileSet);

      // --- domain external purity (applies even to unresolved external pkgs) ---
      if (!isTest && !imp.typeOnly && from.top === 'modules' && from.layer === 'domain' && target === null) {
        if (IMPURE_EXTERNAL.some((re) => re.test(imp.spec))) {
          add('domain-impure-external', from, imp, RULE_DESCRIPTIONS['domain-impure-external']);
        }
        continue;
      }

      if (target === null) continue; // external, nothing more to check

      const to = classify(root, target, moduleDirSet);

      // Build the module runtime graph (excludes tests + type-only edges).
      if (!isTest && !imp.typeOnly && from.top === 'modules' && from.mod && to.top === 'modules' && to.mod && to.mod !== from.mod) {
        if (!graph.has(from.mod)) graph.set(from.mod, new Set());
        graph.get(from.mod)!.add(to.mod);
      }

      if (isTest) continue; // tests are exempt from the cross-boundary matrix
      if (imp.typeOnly) continue; // type-only edges are erased escape hatches

      // (c) shared kernel must not reach into features or routes
      if (SHARED_TOPS.has(from.top) && (to.top === 'modules' || to.top === 'app')) {
        add('shared-no-feature', from, imp, RULE_DESCRIPTIONS['shared-no-feature']);
      }

      if (from.top !== 'modules' || !from.mod) continue;

      // (d) no module -> app/ back-reference (umbrella over every layer)
      if (to.top === 'app') {
        add('module-no-app', from, imp, RULE_DESCRIPTIONS['module-no-app']);
      }

      const sameModule = to.top === 'modules' && to.mod === from.mod;
      const otherModule = to.top === 'modules' && to.mod !== from.mod;

      if (from.layer === 'domain') {
        if (to.top === 'components' || to.top === 'lib') {
          add('domain-no-shared-io', from, imp, RULE_DESCRIPTIONS['domain-no-shared-io']);
        }
        if (sameModule && to.layer !== 'domain' && to.layer !== 'root') {
          add('domain-no-own-nondomain', from, imp, RULE_DESCRIPTIONS['domain-no-own-nondomain']);
        }
        if (otherModule && to.layer !== 'domain') {
          add('domain-no-cross-nondomain', from, imp, RULE_DESCRIPTIONS['domain-no-cross-nondomain']);
        }
      } else if (from.layer === 'infrastructure') {
        if (to.top === 'components') add('infra-no-components', from, imp, RULE_DESCRIPTIONS['infra-no-components']);
        if (otherModule) add('infra-no-cross-module', from, imp, RULE_DESCRIPTIONS['infra-no-cross-module']);
        if (sameModule && (to.layer === 'application' || to.layer === 'ui')) {
          add('infra-no-own-app-ui', from, imp, RULE_DESCRIPTIONS['infra-no-own-app-ui']);
        }
      } else if (from.layer === 'application') {
        if (to.top === 'components') add('application-no-components', from, imp, RULE_DESCRIPTIONS['application-no-components']);
        if (otherModule && (to.layer === 'ui' || to.layer === 'infrastructure')) {
          add('application-no-cross-ui-infra', from, imp, RULE_DESCRIPTIONS['application-no-cross-ui-infra']);
        }
      } else if (from.layer === 'ui') {
        if (otherModule) add('ui-no-cross-runtime', from, imp, RULE_DESCRIPTIONS['ui-no-cross-runtime']);
      }
    }
  }

  const moduleGraph: Record<string, string[]> = {};
  for (const [k, v] of graph) moduleGraph[k] = [...v].sort();

  const cycles = detectCycles(graph);

  return {
    root,
    fileCount: files.length,
    violations: violations.sort((a, b) => violationKey(a).localeCompare(violationKey(b))),
    cycles,
    moduleGraph,
    moduleDirs: moduleDirNames,
    manifestNames: parseManifestNames(root),
  };
}

function detectCycles(graph: Map<string, Set<string>>): ModuleCycle[] {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const found = new Map<string, ModuleCycle>();

  const visit = (node: string, stack: string[]) => {
    color.set(node, GRAY);
    stack.push(node);
    for (const next of [...(graph.get(node) ?? [])].sort()) {
      const state = color.get(next) ?? WHITE;
      if (state === GRAY) {
        const start = stack.indexOf(next);
        const loop = [...stack.slice(start), next];
        const members = [...new Set(loop)].sort();
        const key = members.join('|');
        if (!found.has(key)) found.set(key, { modules: members, path: loop, key });
      } else if (state === WHITE) {
        visit(next, stack);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  };

  for (const node of [...graph.keys()].sort()) {
    if ((color.get(node) ?? WHITE) === WHITE) visit(node, []);
  }
  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function violationKey(v: Violation): string {
  return `${v.rule} :: ${v.file} :: ${v.spec}`;
}

export function formatViolation(v: Violation): string {
  return `[${v.rule}] ${v.file}:${v.line} imports '${v.spec}' — ${v.detail}`;
}
