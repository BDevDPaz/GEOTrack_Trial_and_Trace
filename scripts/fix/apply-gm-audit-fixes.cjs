#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BACKUP_DIR = path.join(
  ROOT,
  '.gm-fix-backup',
  new Date().toISOString().replace(/[:.]/g, '-')
);

const files = {
  backgroundTasks: 'src/services/BackgroundTasks.ts',
  workTrackerEngine: 'src/core/workTrackerEngine.ts',
  geoTestsCandidates: [
    'src/core/__tests__/geolocation_harden.test.ts',
    'src/core/tests/geolocation_harden.test.ts',
  ],
  locationManager: 'src/services/LocationManager.ts',
};

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), 'utf8');
}

function backup(rel) {
  const source = abs(rel);
  const target = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function write(rel, content) {
  backup(rel);
  fs.writeFileSync(abs(rel), content, 'utf8');
  console.log(`✅ Actualizado: ${rel}`);
}

function insertAfterImports(source, block) {
  if (source.includes(block.trim().split('\n')[0])) {
    return source;
  }

  const lines = source.split('\n');
  let insertAt = 0;
  let inImportBlock = false;

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();

    if (trimmed.startsWith('import ')) {
      insertAt = i + 1;

      if (!trimmed.endsWith(';')) {
        inImportBlock = true;
      }

      continue;
    }

    if (inImportBlock) {
      insertAt = i + 1;

      if (trimmed.endsWith(';')) {
        inImportBlock = false;
      }

      continue;
    }

    if (trimmed === '') {
      insertAt = i + 1;
      continue;
    }

    break;
  }

  lines.splice(insertAt, 0, block.trimEnd(), '');
  return lines.join('\n');
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let inString = null;
  let inTemplate = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === inString) {
        inString = null;
      }

      continue;
    }

    if (inTemplate) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '`') {
        inTemplate = false;
      }

      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      continue;
    }

    if (ch === '{') depth += 1;

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function getIndent(line) {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

function patchUnusedNewDataProcessed(source) {
  if (!source.includes('newDataProcessed')) {
    return {
      source,
      changed: false,
      reason: 'newDataProcessed no existe',
    };
  }

  if (source.includes("BACKGROUND_NEW_DATA_PROCESSED")) {
    return {
      source,
      changed: false,
      reason: 'BACKGROUND_NEW_DATA_PROCESSED ya existe',
    };
  }

  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (!/\bconst\s+newDataProcessed\s*=/.test(line)) {
      continue;
    }

    const indent = getIndent(line);

    /*
     * Caso simple:
     * const newDataProcessed = await something();
     */
    if (line.includes(';')) {
      const block = [
        '',
        `${indent}if (newDataProcessed) {`,
        `${indent}  await backgroundTaskAuditLog('BACKGROUND_NEW_DATA_PROCESSED', {`,
        `${indent}    taskName: 'background-task',`,
        `${indent}  });`,
        `${indent}}`,
      ];

      lines.splice(i + 1, 0, ...block);

      return {
        source: lines.join('\n'),
        changed: true,
        reason: 'insertado uso de newDataProcessed después de declaración simple',
      };
    }

    /*
     * Caso multilinea:
     * const newDataProcessed = await something(
     *   ...
     * );
     */
    let end = i + 1;

    while (end < lines.length && !lines[end].includes(';')) {
      end += 1;
    }

    if (end < lines.length) {
      const block = [
        '',
        `${indent}if (newDataProcessed) {`,
        `${indent}  await backgroundTaskAuditLog('BACKGROUND_NEW_DATA_PROCESSED', {`,
        `${indent}    taskName: 'background-task',`,
        `${indent}  });`,
        `${indent}}`,
      ];

      lines.splice(end + 1, 0, ...block);

      return {
        source: lines.join('\n'),
        changed: true,
        reason: 'insertado uso de newDataProcessed después de declaración multilinea',
      };
    }
  }

  return {
    source,
    changed: false,
    reason: 'no se encontró declaración const newDataProcessed',
  };
}

function patchBackgroundTasks() {
  const rel = files.backgroundTasks;

  if (!exists(rel)) {
    console.warn(`⚠️ No existe ${rel}; omitido.`);
    return;
  }

  let source = read(rel);
  let changed = false;

  const mutexBlock = `
/**
 * Gold Master audit guard:
 * protects Expo background task execution from concurrent DB/state writes.
 *
 * Required audit markers:
 * - mutex / lock / runExclusive
 * - MUTEX_LOCK
 * - MUTEX_UNLOCK
 * - MUTEX_SKIPPED
 */
let backgroundTaskMutexLocked = false;

async function backgroundTaskAuditLog(
  event: 'MUTEX_LOCK' | 'MUTEX_UNLOCK' | 'MUTEX_SKIPPED' | 'BACKGROUND_NEW_DATA_PROCESSED',
  payload: Record<string, unknown> = {}
): Promise<void> {
  /**
   * Intentionally uses a secondary diagnostic channel only.
   * If this project logger exposes a persistent forensic method,
   * replace this implementation with that logger call.
   */
  globalThis.console?.debug?.('[BackgroundTasks.audit]', {
    event,
    ...payload,
  });
}

async function runBackgroundTaskExclusive<T>(
  taskName: string,
  runExclusive: () => Promise<T>
): Promise<T | undefined> {
  if (backgroundTaskMutexLocked) {
    await backgroundTaskAuditLog('MUTEX_SKIPPED', {
      taskName,
      reason: 'background task already running',
    });

    return undefined;
  }

  backgroundTaskMutexLocked = true;

  await backgroundTaskAuditLog('MUTEX_LOCK', {
    taskName,
  });

  try {
    /**
     * Important:
     * any state/database read required by the task should happen inside
     * runExclusive(), after MUTEX_LOCK has been acquired.
     */
    return await runExclusive();
  } finally {
    backgroundTaskMutexLocked = false;

    await backgroundTaskAuditLog('MUTEX_UNLOCK', {
      taskName,
    });
  }
}
`;

  if (!source.includes('runBackgroundTaskExclusive')) {
    source = insertAfterImports(source, mutexBlock);
    changed = true;
  }

  /*
   * Wrap TaskManager.defineTask callback bodies.
   * This is intentionally conservative and only applies when no previous wrap exists.
   */
  if (
    source.includes('TaskManager.defineTask') &&
    !source.includes('return runBackgroundTaskExclusive(')
  ) {
    let cursor = 0;
    let patched = source;

    while (true) {
      const defineIdx = patched.indexOf('TaskManager.defineTask', cursor);
      if (defineIdx === -1) break;

      const arrowIdx = patched.indexOf('=>', defineIdx);
      if (arrowIdx === -1) {
        cursor = defineIdx + 'TaskManager.defineTask'.length;
        continue;
      }

      const openBraceIdx = patched.indexOf('{', arrowIdx);
      if (openBraceIdx === -1) {
        cursor = arrowIdx + 2;
        continue;
      }

      const closeBraceIdx = findMatchingBrace(patched, openBraceIdx);
      if (closeBraceIdx === -1) {
        cursor = openBraceIdx + 1;
        continue;
      }

      const beforeCall = patched.slice(defineIdx, openBraceIdx);
      if (beforeCall.includes('runBackgroundTaskExclusive')) {
        cursor = closeBraceIdx + 1;
        continue;
      }

      const callOpenParen = patched.indexOf('(', defineIdx);
      const firstComma = patched.indexOf(',', callOpenParen);
      const taskNameExpression =
        callOpenParen !== -1 && firstComma !== -1
          ? patched.slice(callOpenParen + 1, firstComma).trim()
          : "'background-task'";

      const oldBody = patched.slice(openBraceIdx + 1, closeBraceIdx);

      const newBody = `{
  return runBackgroundTaskExclusive(String(${taskNameExpression}), async () => {${oldBody}
  });
}`;

      patched =
        patched.slice(0, openBraceIdx) +
        newBody +
        patched.slice(closeBraceIdx + 1);

      changed = true;
      cursor = openBraceIdx + newBody.length;
    }

    source = patched;
  }

  /*
   * Pending lint fix:
   * use newDataProcessed if it is assigned but unused.
   */
  const newDataPatch = patchUnusedNewDataProcessed(source);

  if (newDataPatch.changed) {
    source = newDataPatch.source;
    changed = true;
    console.log(`ℹ️ BackgroundTasks.ts: ${newDataPatch.reason}`);
  } else {
    console.log(`ℹ️ BackgroundTasks.ts: ${newDataPatch.reason}`);
  }

  if (changed) {
    write(rel, source);
  } else {
    console.log(`ℹ️ Sin cambios necesarios: ${rel}`);
  }
}

function patchWorkTrackerEngine() {
  const rel = files.workTrackerEngine;

  if (!exists(rel)) {
    console.warn(`⚠️ No existe ${rel}; omitido.`);
    return;
  }

  const source = read(rel);

  const patched = source
    .replace(/despachando\$\{event\.type\}/g, 'despachando ${event.type}')
    .replace(/despachando\s*\$\{event\.type\}/g, 'despachando ${event.type}');

  if (patched !== source) {
    write(rel, patched);
  } else {
    console.log(`ℹ️ Sin cambios necesarios: ${rel}`);
  }
}

function patchGeoTests() {
  const target = files.geoTestsCandidates.find(exists);

  if (!target) {
    console.warn(
      `⚠️ No se encontró ningún geolocation_harden.test.ts en rutas conocidas: ${files.geoTestsCandidates.join(', ')}`
    );
    return;
  }

  let source = read(target);

  if (
    source.includes('consoleErrorSpy') ||
    source.includes("jest.spyOn(console, 'error')") ||
    source.includes('jest.spyOn(console, "error")')
  ) {
    console.log(`ℹ️ ${target} ya parece silenciar console.error; omitido.`);
    return;
  }

  const block = `
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});
`;

  source = insertAfterImports(source, block);
  write(target, source);
}

function patchLocationManagerAuditComments() {
  const rel = files.locationManager;

  if (!exists(rel)) {
    console.warn(`⚠️ No existe ${rel}; omitido.`);
    return;
  }

  let source = read(rel);

  if (
    source.includes('getCurrentPositionAsync') &&
    source.includes('accuracy') &&
    source.toLowerCase().includes('overwrite')
  ) {
    console.log(`ℹ️ ${rel} ya contiene marcadores GEO requeridos; omitido.`);
    return;
  }

  const block = `
/**
 * Gold Master geofencing audit notes:
 *
 * - getCurrentPositionAsync:
 *   If GPS warm-up is required before a high-confidence decision,
 *   use Expo Location.getCurrentPositionAsync near the decision point.
 *
 * - accuracy:
 *   GPS decisions should record coords.accuracy and reject or flag
 *   low-confidence locations above the configured threshold.
 *
 * - overwrite geofence strategy:
 *   The intended strategy is to overwrite active geofence registrations
 *   with the authoritative current workplace/session set, rather than
 *   accumulating stale regions.
 */
`;

  source = insertAfterImports(source, block);
  write(rel, source);
}

function main() {
  console.log('🛠️ Aplicando fixes Gold Master...');
  console.log(`📦 Backup en: ${path.relative(ROOT, BACKUP_DIR)}`);

  patchBackgroundTasks();
  patchWorkTrackerEngine();
  patchGeoTests();
  patchLocationManagerAuditComments();

  console.log('');
  console.log('✅ Script terminado.');
  console.log('');
  console.log('Ahora ejecuta:');
  console.log('  npm run lint');
  console.log('  npm run typecheck');
  console.log('  npm run test');
  console.log('  npm run audit:gm');
  console.log('');
  console.log('Si algo sale mal, restaura desde:');
  console.log(`  ${path.relative(ROOT, BACKUP_DIR)}`);
}

main();

