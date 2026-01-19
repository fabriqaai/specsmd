#!/usr/bin/env node

/**
 * FIRE Run Initialization Script
 *
 * Creates run record in state.yaml and run folder structure.
 * Ensures deterministic run ID generation by checking BOTH:
 * - runs.completed history in state.yaml
 * - existing run folders in .specs-fire/runs/
 *
 * Usage: node init-run.js <rootPath> <workItemId> <intentId> <mode>
 *
 * Example: node init-run.js /project login-endpoint user-auth confirm
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// =============================================================================
// Error Helper
// =============================================================================

function fireError(message, code, suggestion) {
  const err = new Error(`FIRE Error [${code}]: ${message} ${suggestion}`);
  err.code = code;
  err.suggestion = suggestion;
  return err;
}

// =============================================================================
// Validation
// =============================================================================

const VALID_MODES = ['autopilot', 'confirm', 'validate'];

function validateInputs(rootPath, workItemId, intentId, mode) {
  if (!rootPath || typeof rootPath !== 'string' || rootPath.trim() === '') {
    throw fireError('rootPath is required.', 'INIT_001', 'Provide a valid project root path.');
  }

  if (!workItemId || typeof workItemId !== 'string' || workItemId.trim() === '') {
    throw fireError('workItemId is required.', 'INIT_010', 'Provide a valid work item ID.');
  }

  if (!intentId || typeof intentId !== 'string' || intentId.trim() === '') {
    throw fireError('intentId is required.', 'INIT_020', 'Provide a valid intent ID.');
  }

  if (!mode || !VALID_MODES.includes(mode)) {
    throw fireError(
      `Invalid mode: "${mode}".`,
      'INIT_030',
      `Valid modes are: ${VALID_MODES.join(', ')}`
    );
  }

  if (!fs.existsSync(rootPath)) {
    throw fireError(
      `Project root not found: "${rootPath}".`,
      'INIT_040',
      'Ensure the path exists and is accessible.'
    );
  }
}

function validateFireProject(rootPath) {
  const fireDir = path.join(rootPath, '.specs-fire');
  const statePath = path.join(fireDir, 'state.yaml');
  const runsPath = path.join(fireDir, 'runs');

  if (!fs.existsSync(fireDir)) {
    throw fireError(
      `FIRE project not initialized at: "${rootPath}".`,
      'INIT_041',
      'Run fire-init first to initialize the project.'
    );
  }

  if (!fs.existsSync(statePath)) {
    throw fireError(
      `State file not found at: "${statePath}".`,
      'INIT_042',
      'The project may be corrupted. Try re-initializing.'
    );
  }

  return { fireDir, statePath, runsPath };
}

// =============================================================================
// State Operations
// =============================================================================

function readState(statePath) {
  try {
    const content = fs.readFileSync(statePath, 'utf8');
    const state = yaml.parse(content);
    if (!state || typeof state !== 'object') {
      throw fireError('State file is empty or invalid.', 'INIT_050', 'Check state.yaml format.');
    }
    return state;
  } catch (err) {
    if (err.code && err.code.startsWith('INIT_')) throw err;
    throw fireError(
      `Failed to read state file: ${err.message}`,
      'INIT_051',
      'Check file permissions and YAML syntax.'
    );
  }
}

function writeState(statePath, state) {
  try {
    fs.writeFileSync(statePath, yaml.stringify(state));
  } catch (err) {
    throw fireError(
      `Failed to write state file: ${err.message}`,
      'INIT_052',
      'Check file permissions and disk space.'
    );
  }
}

// =============================================================================
// Run ID Generation (CRITICAL - checks both history and file system)
// =============================================================================

function generateRunId(runsPath, state) {
  // Ensure runs directory exists
  if (!fs.existsSync(runsPath)) {
    fs.mkdirSync(runsPath, { recursive: true });
  }

  // Source 1: Get max from state.yaml runs.completed history
  let maxFromHistory = 0;
  if (state.runs && Array.isArray(state.runs.completed)) {
    for (const run of state.runs.completed) {
      if (run.id) {
        const match = run.id.match(/^run-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxFromHistory) maxFromHistory = num;
        }
      }
    }
  }

  // Source 2: Get max from file system (defensive)
  let maxFromFileSystem = 0;
  try {
    const entries = fs.readdirSync(runsPath);
    for (const entry of entries) {
      if (/^run-\d{3,}$/.test(entry)) {
        const num = parseInt(entry.replace('run-', ''), 10);
        if (num > maxFromFileSystem) maxFromFileSystem = num;
      }
    }
  } catch (err) {
    throw fireError(
      `Failed to read runs directory: ${err.message}`,
      'INIT_060',
      'Check directory permissions.'
    );
  }

  // Use MAX of both to ensure no duplicates
  const maxNum = Math.max(maxFromHistory, maxFromFileSystem);
  const nextNum = maxNum + 1;

  return `run-${String(nextNum).padStart(3, '0')}`;
}

// =============================================================================
// Run Folder Creation
// =============================================================================

function createRunFolder(runPath) {
  try {
    fs.mkdirSync(runPath, { recursive: true });
  } catch (err) {
    throw fireError(
      `Failed to create run folder: ${err.message}`,
      'INIT_070',
      'Check directory permissions and disk space.'
    );
  }
}

function createRunLog(runPath, runId, workItemId, intentId, mode, startTime) {
  const runLog = `---
id: ${runId}
work_item: ${workItemId}
intent: ${intentId}
mode: ${mode}
status: in_progress
started: ${startTime}
completed: null
---

# Run: ${runId}

## Work Item
${workItemId}

## Files Created
(none yet)

## Files Modified
(none yet)

## Decisions
(none yet)
`;

  const runLogPath = path.join(runPath, 'run.md');
  try {
    fs.writeFileSync(runLogPath, runLog);
  } catch (err) {
    throw fireError(
      `Failed to create run log: ${err.message}`,
      'INIT_071',
      'Check file permissions.'
    );
  }
}

// =============================================================================
// Main Function
// =============================================================================

function initRun(rootPath, workItemId, intentId, mode) {
  // Validate inputs
  validateInputs(rootPath, workItemId, intentId, mode);

  // Validate FIRE project structure
  const { statePath, runsPath } = validateFireProject(rootPath);

  // Read state
  const state = readState(statePath);

  // Check for existing active run
  if (state.active_run) {
    throw fireError(
      `A run is already active: "${state.active_run.id}".`,
      'INIT_080',
      `Complete or cancel run "${state.active_run.id}" before starting a new one.`
    );
  }

  // Generate run ID (checks both history AND file system)
  const runId = generateRunId(runsPath, state);
  const runPath = path.join(runsPath, runId);

  // Create run folder
  createRunFolder(runPath);

  // Create run log
  const startTime = new Date().toISOString();
  createRunLog(runPath, runId, workItemId, intentId, mode, startTime);

  // Update state with active run
  state.active_run = {
    id: runId,
    work_item: workItemId,
    intent: intentId,
    mode: mode,
    started: startTime,
  };

  // Save state
  writeState(statePath, state);

  // Return result
  return {
    success: true,
    runId: runId,
    runPath: runPath,
    workItemId: workItemId,
    intentId: intentId,
    mode: mode,
    started: startTime,
  };
}

// =============================================================================
// CLI Interface
// =============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.error('Usage: node init-run.js <rootPath> <workItemId> <intentId> <mode>');
    console.error('');
    console.error('Arguments:');
    console.error('  rootPath    - Project root directory');
    console.error('  workItemId  - Work item ID to execute');
    console.error('  intentId    - Intent ID containing the work item');
    console.error('  mode        - Execution mode (autopilot, confirm, validate)');
    console.error('');
    console.error('Example:');
    console.error('  node init-run.js /my/project login-endpoint user-auth confirm');
    process.exit(1);
  }

  const [rootPath, workItemId, intentId, mode] = args;

  try {
    const result = initRun(rootPath, workItemId, intentId, mode);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { initRun };
