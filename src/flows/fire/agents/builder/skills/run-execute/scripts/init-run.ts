/**
 * Initialize a new run
 *
 * Creates run record in state.yaml and run folder structure
 *
 * This script is defensive and provides clear error messages for both
 * humans and AI agents to understand failures and how to fix them.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  rmSync,
} from 'fs';
import { join, isAbsolute } from 'path';
import * as yaml from 'yaml';

// =============================================================================
// Types
// =============================================================================

interface RunInit {
  workItemId: string;
  intentId: string;
  mode: 'autopilot' | 'confirm' | 'validate';
}

interface WorkItem {
  id: string;
  [key: string]: unknown;
}

interface Intent {
  id: string;
  work_items?: WorkItem[];
  [key: string]: unknown;
}

interface ActiveRun {
  id: string;
  work_item: string;
  intent: string;
  mode: string;
  started: string;
}

interface State {
  project?: { name?: string };
  intents?: Intent[];
  active_run?: ActiveRun | null;
}

// =============================================================================
// Custom Error Class
// =============================================================================

export class FireError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion: string
  ) {
    super(`FIRE Error [${code}]: ${message} ${suggestion}`);
    this.name = 'FireError';
  }
}

// =============================================================================
// Validation Helpers
// =============================================================================

const VALID_MODES = ['autopilot', 'confirm', 'validate'] as const;

function validateRootPath(rootPath: unknown): asserts rootPath is string {
  if (rootPath === undefined || rootPath === null) {
    throw new FireError(
      'rootPath is required but was not provided.',
      'INIT_001',
      'Ensure the calling code passes a valid project root path.'
    );
  }

  if (typeof rootPath !== 'string') {
    throw new FireError(
      `rootPath must be a string, but received ${typeof rootPath}.`,
      'INIT_002',
      'Ensure the calling code passes a string path.'
    );
  }

  if (rootPath.trim() === '') {
    throw new FireError(
      'rootPath cannot be empty.',
      'INIT_003',
      'Provide a valid project root path.'
    );
  }

  if (!isAbsolute(rootPath)) {
    throw new FireError(
      `rootPath must be an absolute path, but received relative path: "${rootPath}".`,
      'INIT_004',
      'Convert the path to absolute using path.resolve() before calling initRun().'
    );
  }

  if (!existsSync(rootPath)) {
    throw new FireError(
      `Project root directory does not exist: "${rootPath}".`,
      'INIT_005',
      'Verify the path is correct and the directory exists.'
    );
  }
}

function validateParams(params: unknown): asserts params is RunInit {
  if (params === undefined || params === null) {
    throw new FireError(
      'params object is required but was not provided.',
      'INIT_010',
      'Pass a params object with workItemId, intentId, and mode.'
    );
  }

  if (typeof params !== 'object') {
    throw new FireError(
      `params must be an object, but received ${typeof params}.`,
      'INIT_011',
      'Pass a params object with workItemId, intentId, and mode.'
    );
  }

  const p = params as Record<string, unknown>;

  // Validate workItemId
  if (p.workItemId === undefined || p.workItemId === null) {
    throw new FireError(
      'workItemId is required but was not provided.',
      'INIT_012',
      'Include workItemId in the params object (e.g., "WI-001").'
    );
  }

  if (typeof p.workItemId !== 'string' || p.workItemId.trim() === '') {
    throw new FireError(
      'workItemId must be a non-empty string.',
      'INIT_013',
      'Provide a valid work item ID (e.g., "WI-001").'
    );
  }

  // Validate intentId
  if (p.intentId === undefined || p.intentId === null) {
    throw new FireError(
      'intentId is required but was not provided.',
      'INIT_014',
      'Include intentId in the params object (e.g., "INT-001").'
    );
  }

  if (typeof p.intentId !== 'string' || p.intentId.trim() === '') {
    throw new FireError(
      'intentId must be a non-empty string.',
      'INIT_015',
      'Provide a valid intent ID (e.g., "INT-001").'
    );
  }

  // Validate mode
  if (p.mode === undefined || p.mode === null) {
    throw new FireError(
      'mode is required but was not provided.',
      'INIT_016',
      `Include mode in the params object. Valid values: ${VALID_MODES.join(', ')}.`
    );
  }

  if (!VALID_MODES.includes(p.mode as (typeof VALID_MODES)[number])) {
    throw new FireError(
      `Invalid mode: "${p.mode}".`,
      'INIT_017',
      `Use one of the valid modes: ${VALID_MODES.join(', ')}.`
    );
  }
}

function validateStateStructure(state: unknown, statePath: string): asserts state is State {
  if (state === undefined || state === null) {
    throw new FireError(
      `state.yaml is empty or invalid at: "${statePath}".`,
      'INIT_020',
      'The state.yaml file must contain valid YAML content. Run /specsmd-fire to reinitialize if needed.'
    );
  }

  if (typeof state !== 'object') {
    throw new FireError(
      `state.yaml must contain a YAML object, but found ${typeof state}.`,
      'INIT_021',
      'Check state.yaml structure. It should be a YAML object with project, intents, and active_run fields.'
    );
  }

  const s = state as Record<string, unknown>;

  // Validate intents array exists (optional but needed for validation)
  if (s.intents !== undefined && !Array.isArray(s.intents)) {
    throw new FireError(
      'state.yaml "intents" field must be an array.',
      'INIT_022',
      'Check state.yaml structure. The "intents" field should be an array of intent objects.'
    );
  }
}

// =============================================================================
// State File Operations
// =============================================================================

function readStateFile(statePath: string): State {
  // Check if .specs-fire directory exists
  const specsFireDir = join(statePath, '..');
  if (!existsSync(specsFireDir)) {
    throw new FireError(
      `.specs-fire directory not found at: "${specsFireDir}".`,
      'INIT_030',
      'Run /specsmd-fire to initialize the FIRE project first.'
    );
  }

  // Check if state.yaml exists
  if (!existsSync(statePath)) {
    throw new FireError(
      `state.yaml not found at: "${statePath}".`,
      'INIT_031',
      'Run /specsmd-fire to initialize the FIRE project first.'
    );
  }

  // Read state file
  let stateContent: string;
  try {
    stateContent = readFileSync(statePath, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw new FireError(
        `Permission denied reading state.yaml at: "${statePath}".`,
        'INIT_032',
        'Check file permissions. Ensure the current user has read access.'
      );
    }
    throw new FireError(
      `Failed to read state.yaml at: "${statePath}". System error: ${err.message}`,
      'INIT_033',
      'Check if the file is locked by another process or if there are disk issues.'
    );
  }

  // Parse YAML
  let state: unknown;
  try {
    state = yaml.parse(stateContent);
  } catch (error) {
    const err = error as Error;
    throw new FireError(
      `state.yaml contains invalid YAML at: "${statePath}". Parse error: ${err.message}`,
      'INIT_034',
      'Fix the YAML syntax in state.yaml or run /specsmd-fire to reinitialize.'
    );
  }

  validateStateStructure(state, statePath);
  return state;
}

function writeStateFile(statePath: string, state: State): void {
  try {
    const yamlContent = yaml.stringify(state);
    writeFileSync(statePath, yamlContent, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw new FireError(
        `Permission denied writing to state.yaml at: "${statePath}".`,
        'INIT_040',
        'Check file permissions. Ensure the current user has write access.'
      );
    }
    if (err.code === 'ENOSPC') {
      throw new FireError(
        `Disk full - cannot write to state.yaml at: "${statePath}".`,
        'INIT_041',
        'Free up disk space and try again.'
      );
    }
    throw new FireError(
      `Failed to write state.yaml at: "${statePath}". System error: ${err.message}`,
      'INIT_042',
      'Check if the file is locked by another process or if there are disk issues.'
    );
  }
}

// =============================================================================
// Run Operations
// =============================================================================

function checkForActiveRun(state: State): void {
  if (state.active_run && state.active_run.id) {
    throw new FireError(
      `An active run already exists: "${state.active_run.id}" for work item "${state.active_run.work_item}".`,
      'INIT_050',
      'Complete or cancel the existing run first using /run-complete or /run-cancel, then start a new run.'
    );
  }
}

function validateIntentAndWorkItem(state: State, intentId: string, workItemId: string): void {
  // If no intents defined, we can't validate but we'll allow it (might be added later)
  if (!state.intents || state.intents.length === 0) {
    // Warning: proceeding without validation
    return;
  }

  // Find the intent
  const intent = state.intents.find((i) => i.id === intentId);
  if (!intent) {
    const availableIntents = state.intents.map((i) => i.id).join(', ');
    throw new FireError(
      `Intent "${intentId}" not found in state.yaml.`,
      'INIT_051',
      `Available intents: ${availableIntents || '(none)'}. Create the intent first or use an existing one.`
    );
  }

  // Find the work item within the intent
  if (intent.work_items && intent.work_items.length > 0) {
    const workItem = intent.work_items.find((w) => w.id === workItemId);
    if (!workItem) {
      const availableWorkItems = intent.work_items.map((w) => w.id).join(', ');
      throw new FireError(
        `Work item "${workItemId}" not found in intent "${intentId}".`,
        'INIT_052',
        `Available work items in this intent: ${availableWorkItems || '(none)'}. Create the work item first or use an existing one.`
      );
    }
  }
}

function generateRunId(runsPath: string): string {
  // Create runs directory if it doesn't exist
  if (!existsSync(runsPath)) {
    try {
      mkdirSync(runsPath, { recursive: true });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      throw new FireError(
        `Failed to create runs directory at: "${runsPath}". System error: ${err.message}`,
        'INIT_060',
        'Check directory permissions and disk space.'
      );
    }
    return 'run-001'; // First run
  }

  // Read existing runs
  let entries: string[];
  try {
    entries = readdirSync(runsPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FireError(
      `Failed to read runs directory at: "${runsPath}". System error: ${err.message}`,
      'INIT_061',
      'Check directory permissions.'
    );
  }

  // Find the highest run number
  const runNumbers = entries
    .filter((f) => /^run-\d{3,}$/.test(f))
    .map((f) => parseInt(f.replace('run-', ''), 10))
    .filter((n) => !isNaN(n));

  const maxNum = runNumbers.length > 0 ? Math.max(...runNumbers) : 0;
  const nextNum = maxNum + 1;

  return `run-${String(nextNum).padStart(3, '0')}`;
}

function createRunFolder(runPath: string): void {
  try {
    mkdirSync(runPath, { recursive: true });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw new FireError(
        `Permission denied creating run folder at: "${runPath}".`,
        'INIT_070',
        'Check directory permissions. Ensure the current user has write access.'
      );
    }
    if (err.code === 'ENOSPC') {
      throw new FireError(
        `Disk full - cannot create run folder at: "${runPath}".`,
        'INIT_071',
        'Free up disk space and try again.'
      );
    }
    throw new FireError(
      `Failed to create run folder at: "${runPath}". System error: ${err.message}`,
      'INIT_072',
      'Check if the path is valid and there are no disk issues.'
    );
  }
}

function createRunLog(runPath: string, runId: string, params: RunInit, startTime: string): void {
  const runLog = `---
id: ${runId}
work_item: ${params.workItemId}
intent: ${params.intentId}
mode: ${params.mode}
status: in_progress
started: ${startTime}
completed: null
---

# Run: ${runId}

## Work Item
${params.workItemId}

## Files Created
(none yet)

## Files Modified
(none yet)

## Decisions
(none yet)
`;

  const runLogPath = join(runPath, 'run.md');
  try {
    writeFileSync(runLogPath, runLog, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    throw new FireError(
      `Failed to create run.md at: "${runLogPath}". System error: ${err.message}`,
      'INIT_080',
      'Check file permissions and disk space.'
    );
  }
}

function rollbackRun(runPath: string): void {
  try {
    if (existsSync(runPath)) {
      rmSync(runPath, { recursive: true, force: true });
    }
  } catch {
    // Best effort rollback - ignore errors
  }
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Initialize a new FIRE run
 *
 * @param rootPath - Absolute path to the project root
 * @param params - Run initialization parameters
 * @returns The generated run ID (e.g., "run-001")
 * @throws {FireError} If validation fails or file operations fail
 *
 * @example
 * ```typescript
 * const runId = initRun('/path/to/project', {
 *   workItemId: 'WI-001',
 *   intentId: 'INT-001',
 *   mode: 'autopilot'
 * });
 * console.log(`Started run: ${runId}`);
 * ```
 */
export function initRun(rootPath: string, params: RunInit): string {
  // ==========================================================================
  // Step 1: Validate inputs
  // ==========================================================================
  validateRootPath(rootPath);
  validateParams(params);

  // ==========================================================================
  // Step 2: Set up paths
  // ==========================================================================
  const statePath = join(rootPath, '.specs-fire', 'state.yaml');
  const runsPath = join(rootPath, '.specs-fire', 'runs');

  // ==========================================================================
  // Step 3: Read and validate current state
  // ==========================================================================
  const state = readStateFile(statePath);

  // ==========================================================================
  // Step 4: Check for existing active run
  // ==========================================================================
  checkForActiveRun(state);

  // ==========================================================================
  // Step 5: Validate intent and work item exist (if intents are defined)
  // ==========================================================================
  validateIntentAndWorkItem(state, params.intentId, params.workItemId);

  // ==========================================================================
  // Step 6: Generate run ID (using max number, not count)
  // ==========================================================================
  const runId = generateRunId(runsPath);
  const runPath = join(runsPath, runId);

  // ==========================================================================
  // Step 7: Create run folder
  // ==========================================================================
  createRunFolder(runPath);

  // ==========================================================================
  // Step 8: Update state with active run
  // ==========================================================================
  const startTime = new Date().toISOString();
  const previousActiveRun = state.active_run; // Save for potential rollback

  state.active_run = {
    id: runId,
    work_item: params.workItemId,
    intent: params.intentId,
    mode: params.mode,
    started: startTime,
  };

  // ==========================================================================
  // Step 9: Save state (with rollback on failure)
  // ==========================================================================
  try {
    writeStateFile(statePath, state);
  } catch (error) {
    // Rollback: remove run folder
    rollbackRun(runPath);
    throw error;
  }

  // ==========================================================================
  // Step 10: Create run log (with rollback on failure)
  // ==========================================================================
  try {
    createRunLog(runPath, runId, params, startTime);
  } catch (error) {
    // Rollback: restore previous state and remove run folder
    state.active_run = previousActiveRun ?? null;
    try {
      writeStateFile(statePath, state);
    } catch {
      // State file write failed - log but continue with main error
    }
    rollbackRun(runPath);
    throw error;
  }

  return runId;
}
