/**
 * Complete a run
 *
 * Finalizes run record and updates state.yaml
 *
 * This script is designed to be used by AI agents and provides:
 * - Clear, actionable error messages
 * - Input validation with helpful guidance
 * - Graceful handling of data quality issues
 * - Warnings for non-fatal problems
 */

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import * as yaml from 'yaml';

// ============================================================================
// Types
// ============================================================================

interface FileChange {
  path: string;
  purpose?: string;
  changes?: string;
}

interface Decision {
  decision: string;
  choice: string;
  rationale: string;
}

interface RunCompletion {
  runId: string;
  filesCreated: Array<{ path: string; purpose: string }>;
  filesModified: Array<{ path: string; changes: string }>;
  decisions: Array<Decision>;
  testsAdded: number;
  coverage: number;
}

interface ActiveRun {
  id: string;
  work_item: string;
  intent: string;
  mode?: string;
  started?: string;
}

interface WorkItem {
  id: string;
  status: string;
  run_id?: string;
}

interface Intent {
  id: string;
  work_items: WorkItem[];
}

interface State {
  intents: Intent[];
  active_run: ActiveRun | null;
}

interface CompletionResult {
  success: boolean;
  runId: string;
  completedAt: string;
  workItemId: string;
  intentId: string;
  warnings: string[];
}

// ============================================================================
// Custom Error Class
// ============================================================================

class FIREError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FIREError';
  }
}

/**
 * Creates a standardized FIRE error message
 */
function fireError(what: string, why: string, howToFix: string, context?: Record<string, unknown>): FIREError {
  const message = `FIRE Error: ${what}. ${why}. ${howToFix}`;
  return new FIREError(message, context);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates the root path exists and is accessible
 */
function validateRootPath(rootPath: unknown): asserts rootPath is string {
  if (rootPath === null || rootPath === undefined) {
    throw fireError(
      'Missing root path',
      'The rootPath parameter was not provided',
      'Ensure the rootPath is passed to completeRun(rootPath, params)'
    );
  }

  if (typeof rootPath !== 'string') {
    throw fireError(
      'Invalid root path type',
      `Expected string but received ${typeof rootPath}`,
      'Pass a valid string path to completeRun()',
      { receivedType: typeof rootPath }
    );
  }

  if (rootPath.trim() === '') {
    throw fireError(
      'Empty root path',
      'The rootPath parameter is an empty string',
      'Provide a valid project root path'
    );
  }

  if (!existsSync(rootPath)) {
    throw fireError(
      `Project root not found at '${rootPath}'`,
      'The specified directory does not exist',
      'Verify the path is correct and the project directory exists',
      { path: rootPath }
    );
  }

  const stats = statSync(rootPath);
  if (!stats.isDirectory()) {
    throw fireError(
      `Root path is not a directory: '${rootPath}'`,
      'The specified path exists but is a file, not a directory',
      'Provide the path to the project root directory',
      { path: rootPath }
    );
  }
}

/**
 * Validates the FIRE project structure exists
 */
function validateProjectStructure(rootPath: string): { statePath: string; runsPath: string } {
  const fireDir = join(rootPath, '.specs-fire');
  const statePath = join(fireDir, 'state.yaml');
  const runsPath = join(fireDir, 'runs');

  if (!existsSync(fireDir)) {
    throw fireError(
      `FIRE project not initialized at '${rootPath}'`,
      `The .specs-fire directory was not found`,
      'Initialize the project first using the fire-init skill or ensure you are in the correct project directory',
      { expectedPath: fireDir }
    );
  }

  if (!existsSync(statePath)) {
    throw fireError(
      `State file not found at '${statePath}'`,
      'The state.yaml file is missing from the .specs-fire directory',
      'The project may be partially initialized. Try re-initializing with fire-init',
      { statePath }
    );
  }

  if (!existsSync(runsPath)) {
    throw fireError(
      `Runs directory not found at '${runsPath}'`,
      'The runs directory is missing from the .specs-fire directory',
      'The project may be partially initialized. Try re-initializing with fire-init',
      { runsPath }
    );
  }

  return { statePath, runsPath };
}

/**
 * Validates the RunCompletion parameters
 */
function validateRunCompletionParams(params: unknown): { validated: RunCompletion; warnings: string[] } {
  const warnings: string[] = [];

  if (params === null || params === undefined) {
    throw fireError(
      'Missing completion parameters',
      'The params object was not provided',
      'Pass a RunCompletion object with runId, filesCreated, filesModified, decisions, testsAdded, and coverage'
    );
  }

  if (typeof params !== 'object') {
    throw fireError(
      'Invalid params type',
      `Expected object but received ${typeof params}`,
      'Pass a valid RunCompletion object',
      { receivedType: typeof params }
    );
  }

  const p = params as Record<string, unknown>;

  // Validate runId (required)
  if (!p.runId || typeof p.runId !== 'string' || p.runId.trim() === '') {
    throw fireError(
      'Missing or invalid runId',
      'The runId parameter is required and must be a non-empty string',
      'Provide the run ID to complete (e.g., "run-001")',
      { receivedRunId: p.runId }
    );
  }

  // Validate filesCreated (optional, default to empty array)
  let filesCreated: Array<{ path: string; purpose: string }> = [];
  if (p.filesCreated === null || p.filesCreated === undefined) {
    warnings.push('filesCreated was not provided, defaulting to empty array');
  } else if (!Array.isArray(p.filesCreated)) {
    warnings.push(`filesCreated should be an array but received ${typeof p.filesCreated}, defaulting to empty array`);
  } else {
    filesCreated = (p.filesCreated as unknown[])
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          warnings.push(`filesCreated[${index}] is not an object, skipping`);
          return null;
        }
        const f = item as Record<string, unknown>;
        if (!f.path || typeof f.path !== 'string') {
          warnings.push(`filesCreated[${index}] missing 'path' property, skipping`);
          return null;
        }
        return {
          path: f.path,
          purpose: typeof f.purpose === 'string' ? f.purpose : '(no purpose specified)',
        };
      })
      .filter((item): item is { path: string; purpose: string } => item !== null);
  }

  // Validate filesModified (optional, default to empty array)
  let filesModified: Array<{ path: string; changes: string }> = [];
  if (p.filesModified === null || p.filesModified === undefined) {
    warnings.push('filesModified was not provided, defaulting to empty array');
  } else if (!Array.isArray(p.filesModified)) {
    warnings.push(`filesModified should be an array but received ${typeof p.filesModified}, defaulting to empty array`);
  } else {
    filesModified = (p.filesModified as unknown[])
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          warnings.push(`filesModified[${index}] is not an object, skipping`);
          return null;
        }
        const f = item as Record<string, unknown>;
        if (!f.path || typeof f.path !== 'string') {
          warnings.push(`filesModified[${index}] missing 'path' property, skipping`);
          return null;
        }
        return {
          path: f.path,
          changes: typeof f.changes === 'string' ? f.changes : '(no changes specified)',
        };
      })
      .filter((item): item is { path: string; changes: string } => item !== null);
  }

  // Validate decisions (optional, default to empty array)
  let decisions: Decision[] = [];
  if (p.decisions === null || p.decisions === undefined) {
    warnings.push('decisions was not provided, defaulting to empty array');
  } else if (!Array.isArray(p.decisions)) {
    warnings.push(`decisions should be an array but received ${typeof p.decisions}, defaulting to empty array`);
  } else {
    decisions = (p.decisions as unknown[])
      .map((item, index) => {
        if (!item || typeof item !== 'object') {
          warnings.push(`decisions[${index}] is not an object, skipping`);
          return null;
        }
        const d = item as Record<string, unknown>;
        if (!d.decision || typeof d.decision !== 'string') {
          warnings.push(`decisions[${index}] missing 'decision' property, skipping`);
          return null;
        }
        return {
          decision: d.decision,
          choice: typeof d.choice === 'string' ? d.choice : '(no choice specified)',
          rationale: typeof d.rationale === 'string' ? d.rationale : '(no rationale specified)',
        };
      })
      .filter((item): item is Decision => item !== null);
  }

  // Validate testsAdded (optional, default to 0)
  let testsAdded = 0;
  if (p.testsAdded === null || p.testsAdded === undefined) {
    warnings.push('testsAdded was not provided, defaulting to 0');
  } else if (typeof p.testsAdded !== 'number' || isNaN(p.testsAdded)) {
    warnings.push(`testsAdded should be a number but received ${typeof p.testsAdded}, defaulting to 0`);
  } else if (p.testsAdded < 0) {
    warnings.push(`testsAdded was negative (${p.testsAdded}), using 0 instead`);
  } else {
    testsAdded = Math.floor(p.testsAdded);
  }

  // Validate coverage (optional, default to 0)
  let coverage = 0;
  if (p.coverage === null || p.coverage === undefined) {
    warnings.push('coverage was not provided, defaulting to 0');
  } else if (typeof p.coverage !== 'number' || isNaN(p.coverage)) {
    warnings.push(`coverage should be a number but received ${typeof p.coverage}, defaulting to 0`);
  } else if (p.coverage < 0) {
    warnings.push(`coverage was negative (${p.coverage}), using 0 instead`);
  } else if (p.coverage > 100) {
    warnings.push(`coverage was greater than 100 (${p.coverage}), capping at 100`);
    coverage = 100;
  } else {
    coverage = p.coverage;
  }

  return {
    validated: {
      runId: p.runId as string,
      filesCreated,
      filesModified,
      decisions,
      testsAdded,
      coverage,
    },
    warnings,
  };
}

// ============================================================================
// Safe File Operations
// ============================================================================

/**
 * Safely reads a file with clear error messages
 */
function safeReadFile(filePath: string, purpose: string): string {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw fireError(
        `Cannot read ${purpose} - file not found`,
        `The file at '${filePath}' does not exist`,
        'Ensure the file exists and the path is correct. If this is a run log, the run may not have been properly initialized',
        { filePath, errorCode: err.code }
      );
    }
    if (err.code === 'EACCES') {
      throw fireError(
        `Cannot read ${purpose} - permission denied`,
        `Insufficient permissions to read '${filePath}'`,
        'Check file permissions and ensure the process has read access',
        { filePath, errorCode: err.code }
      );
    }
    throw fireError(
      `Cannot read ${purpose}`,
      `Unexpected error reading '${filePath}': ${err.message}`,
      'Check the file path and permissions',
      { filePath, errorCode: err.code, errorMessage: err.message }
    );
  }
}

/**
 * Safely writes a file with clear error messages
 */
function safeWriteFile(filePath: string, content: string, purpose: string): void {
  try {
    writeFileSync(filePath, content);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'EACCES') {
      throw fireError(
        `Cannot write ${purpose} - permission denied`,
        `Insufficient permissions to write to '${filePath}'`,
        'Check file permissions and ensure the process has write access',
        { filePath, errorCode: err.code }
      );
    }
    if (err.code === 'ENOSPC') {
      throw fireError(
        `Cannot write ${purpose} - disk full`,
        `No space left on device to write '${filePath}'`,
        'Free up disk space and try again',
        { filePath, errorCode: err.code }
      );
    }
    throw fireError(
      `Cannot write ${purpose}`,
      `Unexpected error writing '${filePath}': ${err.message}`,
      'Check the file path and permissions',
      { filePath, errorCode: err.code, errorMessage: err.message }
    );
  }
}

/**
 * Safely parses YAML content with clear error messages
 */
function safeParseYaml<T>(content: string, filePath: string, purpose: string): T {
  try {
    const parsed = yaml.parse(content);
    if (parsed === null || parsed === undefined) {
      throw fireError(
        `${purpose} is empty or invalid`,
        `The file at '${filePath}' contains no valid YAML data`,
        'Check the file contents and ensure it contains valid YAML',
        { filePath }
      );
    }
    return parsed as T;
  } catch (error) {
    if (error instanceof FIREError) {
      throw error;
    }
    const err = error as Error;
    throw fireError(
      `Cannot parse ${purpose} as YAML`,
      `Invalid YAML syntax in '${filePath}': ${err.message}`,
      'Check the file for YAML syntax errors (incorrect indentation, missing colons, etc.)',
      { filePath, parseError: err.message }
    );
  }
}

// ============================================================================
// State Validation
// ============================================================================

/**
 * Validates state structure and active run
 */
function validateState(state: unknown, statePath: string, runId: string): { state: State; warnings: string[] } {
  const warnings: string[] = [];

  if (typeof state !== 'object' || state === null) {
    throw fireError(
      'Invalid state file structure',
      'The state.yaml file does not contain a valid object',
      'Check the state.yaml file format and ensure it follows the FIRE schema',
      { statePath }
    );
  }

  const s = state as Record<string, unknown>;

  // Validate active_run exists
  if (s.active_run === null || s.active_run === undefined) {
    throw fireError(
      'Cannot complete run - no active run found in state.yaml',
      'The run may have already been completed, was never started, or was cancelled',
      'Start a new run using run-init before attempting to complete. Check state.yaml to see the current project state',
      { statePath, runId }
    );
  }

  if (typeof s.active_run !== 'object') {
    throw fireError(
      'Invalid active_run in state.yaml',
      `active_run should be an object but is ${typeof s.active_run}`,
      'The state.yaml file may be corrupted. Check the active_run section',
      { statePath, activeRunType: typeof s.active_run }
    );
  }

  const activeRun = s.active_run as Record<string, unknown>;

  // Validate active_run has required fields
  if (!activeRun.id || typeof activeRun.id !== 'string') {
    throw fireError(
      'Active run missing ID',
      'The active_run in state.yaml does not have a valid id field',
      'The state.yaml file may be corrupted. Check the active_run.id field',
      { statePath }
    );
  }

  // Validate runId matches active_run.id
  if (activeRun.id !== runId) {
    throw fireError(
      `Run ID mismatch - attempting to complete '${runId}' but active run is '${activeRun.id}'`,
      'The run you are trying to complete does not match the currently active run',
      `Either complete the active run '${activeRun.id}' first, or verify you are using the correct run ID`,
      { attemptedRunId: runId, activeRunId: activeRun.id }
    );
  }

  if (!activeRun.work_item || typeof activeRun.work_item !== 'string') {
    throw fireError(
      'Active run missing work_item reference',
      'The active_run in state.yaml does not have a valid work_item field',
      'The state.yaml file may be corrupted. Check the active_run.work_item field',
      { statePath }
    );
  }

  if (!activeRun.intent || typeof activeRun.intent !== 'string') {
    throw fireError(
      'Active run missing intent reference',
      'The active_run in state.yaml does not have a valid intent field',
      'The state.yaml file may be corrupted. Check the active_run.intent field',
      { statePath }
    );
  }

  // Validate intents array exists
  if (!Array.isArray(s.intents)) {
    if (s.intents === null || s.intents === undefined) {
      warnings.push('intents array is missing from state.yaml, will not update work item status');
    } else {
      warnings.push(`intents should be an array but is ${typeof s.intents}, will not update work item status`);
    }
  }

  return {
    state: {
      intents: Array.isArray(s.intents) ? (s.intents as Intent[]) : [],
      active_run: {
        id: activeRun.id as string,
        work_item: activeRun.work_item as string,
        intent: activeRun.intent as string,
        mode: typeof activeRun.mode === 'string' ? activeRun.mode : undefined,
        started: typeof activeRun.started === 'string' ? activeRun.started : undefined,
      },
    },
    warnings,
  };
}

/**
 * Validates and updates work item status
 */
function updateWorkItemStatus(
  state: State,
  intentId: string,
  workItemId: string,
  runId: string
): { updated: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (state.intents.length === 0) {
    warnings.push(`No intents found in state - work item '${workItemId}' status was not updated`);
    return { updated: false, warnings };
  }

  const intent = state.intents.find((i) => i.id === intentId);
  if (!intent) {
    warnings.push(
      `Intent '${intentId}' not found in state.intents - work item '${workItemId}' status was not updated. ` +
        'The intent may have been deleted or renamed'
    );
    return { updated: false, warnings };
  }

  if (!Array.isArray(intent.work_items)) {
    warnings.push(
      `Intent '${intentId}' has no work_items array - work item '${workItemId}' status was not updated`
    );
    return { updated: false, warnings };
  }

  const workItem = intent.work_items.find((w) => w.id === workItemId);
  if (!workItem) {
    warnings.push(
      `Work item '${workItemId}' not found in intent '${intentId}' - status was not updated. ` +
        'The work item may have been deleted or renamed'
    );
    return { updated: false, warnings };
  }

  // Check if already completed
  if (workItem.status === 'completed') {
    warnings.push(
      `Work item '${workItemId}' was already marked as completed. Updating run_id to '${runId}'`
    );
  }

  workItem.status = 'completed';
  workItem.run_id = runId;
  return { updated: true, warnings };
}

// ============================================================================
// Run Log Update
// ============================================================================

/**
 * Updates the run log file with completion data
 */
function updateRunLog(
  runLogPath: string,
  runLogContent: string,
  params: RunCompletion,
  completedTime: string
): { updated: string; warnings: string[] } {
  const warnings: string[] = [];
  let updatedContent = runLogContent;

  // Check if already completed
  if (runLogContent.includes('status: completed')) {
    warnings.push('Run log already shows status: completed - this run may have been completed before');
  }

  // Update status
  if (runLogContent.includes('status: in_progress')) {
    updatedContent = updatedContent.replace(/status: in_progress/, 'status: completed');
  } else {
    warnings.push('Could not find "status: in_progress" in run log - status may not have been updated');
  }

  // Update completed timestamp
  if (runLogContent.includes('completed: null')) {
    updatedContent = updatedContent.replace(/completed: null/, `completed: ${completedTime}`);
  } else {
    warnings.push('Could not find "completed: null" in run log - completion timestamp may not have been set');
  }

  // Build sections
  const filesCreatedSection =
    params.filesCreated.length > 0
      ? params.filesCreated.map((f) => `- \`${f.path}\`: ${f.purpose}`).join('\n')
      : '(none)';

  const filesModifiedSection =
    params.filesModified.length > 0
      ? params.filesModified.map((f) => `- \`${f.path}\`: ${f.changes}`).join('\n')
      : '(none)';

  const decisionsSection =
    params.decisions.length > 0
      ? params.decisions.map((d) => `- **${d.decision}**: ${d.choice} (${d.rationale})`).join('\n')
      : '(none)';

  // Update sections
  if (runLogContent.includes('## Files Created\n(none yet)')) {
    updatedContent = updatedContent.replace('## Files Created\n(none yet)', `## Files Created\n${filesCreatedSection}`);
  } else {
    warnings.push('Could not find "## Files Created\\n(none yet)" pattern - files created section may not have been updated');
  }

  if (runLogContent.includes('## Files Modified\n(none yet)')) {
    updatedContent = updatedContent.replace(
      '## Files Modified\n(none yet)',
      `## Files Modified\n${filesModifiedSection}`
    );
  } else {
    warnings.push(
      'Could not find "## Files Modified\\n(none yet)" pattern - files modified section may not have been updated'
    );
  }

  if (runLogContent.includes('## Decisions\n(none yet)')) {
    updatedContent = updatedContent.replace('## Decisions\n(none yet)', `## Decisions\n${decisionsSection}`);
  } else {
    warnings.push('Could not find "## Decisions\\n(none yet)" pattern - decisions section may not have been updated');
  }

  // Check if summary already exists to avoid duplicates
  if (runLogContent.includes('## Summary')) {
    warnings.push('Run log already contains a Summary section - not adding duplicate');
  } else {
    // Add summary
    updatedContent += `

## Summary

- Files created: ${params.filesCreated.length}
- Files modified: ${params.filesModified.length}
- Tests added: ${params.testsAdded}
- Coverage: ${params.coverage}%
- Completed: ${completedTime}
`;
  }

  return { updated: updatedContent, warnings };
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Completes a FIRE run and updates state
 *
 * @param rootPath - The project root path
 * @param params - Run completion parameters
 * @returns CompletionResult with success status, run details, and any warnings
 * @throws FIREError with clear, actionable error messages for critical failures
 */
export function completeRun(rootPath: string, params: RunCompletion): CompletionResult {
  const allWarnings: string[] = [];

  // ============================================
  // Phase 1: Input Validation (fail fast)
  // ============================================

  // Validate root path
  validateRootPath(rootPath);

  // Validate project structure
  const { statePath, runsPath } = validateProjectStructure(rootPath);

  // Validate and normalize params
  const { validated: validatedParams, warnings: paramWarnings } = validateRunCompletionParams(params);
  allWarnings.push(...paramWarnings);

  // Validate run directory exists
  const runPath = join(runsPath, validatedParams.runId);
  if (!existsSync(runPath)) {
    throw fireError(
      `Run directory not found: '${validatedParams.runId}'`,
      `The directory at '${runPath}' does not exist`,
      'Ensure the run was properly initialized with run-init before attempting to complete',
      { runPath, runId: validatedParams.runId }
    );
  }

  const runLogPath = join(runPath, 'run.md');
  if (!existsSync(runLogPath)) {
    throw fireError(
      `Run log not found for '${validatedParams.runId}'`,
      `The run.md file at '${runLogPath}' does not exist`,
      'The run may have been partially initialized. Check the run directory and try re-initializing',
      { runLogPath, runId: validatedParams.runId }
    );
  }

  // ============================================
  // Phase 2: Read and Validate State
  // ============================================

  const stateContent = safeReadFile(statePath, 'state file');
  const parsedState = safeParseYaml<unknown>(stateContent, statePath, 'state file');
  const { state, warnings: stateWarnings } = validateState(parsedState, statePath, validatedParams.runId);
  allWarnings.push(...stateWarnings);

  // At this point we know active_run is valid
  const { work_item: workItemId, intent: intentId } = state.active_run!;

  // ============================================
  // Phase 3: Update State
  // ============================================

  // Update work item status
  const { warnings: workItemWarnings } = updateWorkItemStatus(state, intentId, workItemId, validatedParams.runId);
  allWarnings.push(...workItemWarnings);

  // Clear active run
  (state as { active_run: ActiveRun | null }).active_run = null;

  // Save state - do this before run log to minimize inconsistency window
  // Preserve other state fields that we didn't modify
  const originalState = parsedState as Record<string, unknown>;
  const updatedStateObj = {
    ...originalState,
    intents: state.intents,
    active_run: null,
  };

  safeWriteFile(statePath, yaml.stringify(updatedStateObj), 'state file');

  // ============================================
  // Phase 4: Update Run Log
  // ============================================

  const runLogContent = safeReadFile(runLogPath, `run log for '${validatedParams.runId}'`);
  const completedTime = new Date().toISOString();

  const { updated: updatedRunLog, warnings: runLogWarnings } = updateRunLog(
    runLogPath,
    runLogContent,
    validatedParams,
    completedTime
  );
  allWarnings.push(...runLogWarnings);

  safeWriteFile(runLogPath, updatedRunLog, `run log for '${validatedParams.runId}'`);

  // ============================================
  // Phase 5: Return Result
  // ============================================

  return {
    success: true,
    runId: validatedParams.runId,
    completedAt: completedTime,
    workItemId,
    intentId,
    warnings: allWarnings,
  };
}
