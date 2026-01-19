/**
 * Unit tests for complete-run.js
 *
 * Tests for completing FIRE runs including:
 * - Input validation (rootPath, runId)
 * - State file validation
 * - Run log updates
 * - Work item status updates
 * - Run history tracking
 * - Error handling with clear messages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as yaml from 'yaml';

// Import the module under test (CommonJS module)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { completeRun } = require('../../../flows/fire/agents/builder/skills/run-execute/scripts/complete-run.js');

// Helper types
interface CompleteRunParams {
  filesCreated?: Array<{ path: string; purpose: string }>;
  filesModified?: Array<{ path: string; changes: string }>;
  decisions?: Array<{ decision: string; choice: string; rationale: string }>;
  testsAdded?: number;
  coverage?: number;
}

interface CompleteRunResult {
  success: boolean;
  runId: string;
  workItemId: string;
  intentId: string;
  completedAt: string;
  filesCreated: number;
  filesModified: number;
  testsAdded: number;
  coverage: number;
}

describe('complete-run', () => {
  let testRoot: string;
  let specsFireDir: string;
  let statePath: string;
  let runsPath: string;

  // Setup a fresh test directory before each test
  beforeEach(() => {
    testRoot = join(tmpdir(), `fire-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    specsFireDir = join(testRoot, '.specs-fire');
    statePath = join(specsFireDir, 'state.yaml');
    runsPath = join(specsFireDir, 'runs');

    // Create the directory structure
    mkdirSync(runsPath, { recursive: true });
  });

  // Cleanup after each test
  afterEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  /**
   * Helper to create a valid state.yaml file
   */
  function createStateFile(content: object): void {
    writeFileSync(statePath, yaml.stringify(content), 'utf8');
  }

  /**
   * Helper to read state.yaml and parse it
   */
  function readStateFile(): object {
    return yaml.parse(readFileSync(statePath, 'utf8'));
  }

  /**
   * Helper to create a run folder with run.md
   */
  function createRunFolder(runId: string): string {
    const runPath = join(runsPath, runId);
    mkdirSync(runPath, { recursive: true });

    const runLog = `---
id: ${runId}
work_item: WI-001
intent: INT-001
mode: autopilot
status: in_progress
started: 2024-01-01T00:00:00Z
completed: null
---

# Run: ${runId}

## Work Item
WI-001

## Files Created
(none yet)

## Files Modified
(none yet)

## Decisions
(none yet)
`;
    writeFileSync(join(runPath, 'run.md'), runLog, 'utf8');
    return runPath;
  }

  /**
   * Helper for valid completion params
   */
  function validParams(): CompleteRunParams {
    return {
      filesCreated: [{ path: 'src/new-file.ts', purpose: 'New feature implementation' }],
      filesModified: [{ path: 'src/existing.ts', changes: 'Added import' }],
      decisions: [{ decision: 'Use pattern X', choice: 'Pattern X', rationale: 'Better performance' }],
      testsAdded: 5,
      coverage: 85,
    };
  }

  // ===========================================================================
  // Input Validation Tests
  // ===========================================================================

  describe('rootPath validation', () => {
    it('should throw when rootPath is null', () => {
      expect(() => completeRun(null, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when rootPath is undefined', () => {
      expect(() => completeRun(undefined, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when rootPath is not a string', () => {
      expect(() => completeRun(123, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when rootPath is empty string', () => {
      expect(() => completeRun('', 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when rootPath does not exist', () => {
      expect(() => completeRun('/nonexistent/path/xyz', 'run-001', validParams()))
        .toThrow('FIRE Error');
    });
  });

  describe('runId validation', () => {
    beforeEach(() => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });
      createRunFolder('run-001');
    });

    it('should throw when runId is null', () => {
      expect(() => completeRun(testRoot, null, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when runId is undefined', () => {
      expect(() => completeRun(testRoot, undefined, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when runId is empty', () => {
      expect(() => completeRun(testRoot, '', validParams()))
        .toThrow('FIRE Error');
    });
  });

  // ===========================================================================
  // Project Structure Validation Tests
  // ===========================================================================

  describe('project structure validation', () => {
    it('should throw when .specs-fire directory does not exist', () => {
      rmSync(specsFireDir, { recursive: true, force: true });

      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when state.yaml does not exist', () => {
      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when run folder does not exist', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when run.md does not exist', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });
      mkdirSync(join(runsPath, 'run-001'));

      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });
  });

  // ===========================================================================
  // State Validation Tests
  // ===========================================================================

  describe('state validation', () => {
    beforeEach(() => {
      createRunFolder('run-001');
    });

    it('should throw when no active run exists', () => {
      createStateFile({
        intents: [],
        active_run: null,
      });

      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw when active_run.id does not match runId', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-002', work_item: 'WI-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, 'run-001', validParams()))
        .toThrow('FIRE Error');
    });
  });

  // ===========================================================================
  // Success Case Tests
  // ===========================================================================

  describe('successful completion', () => {
    beforeEach(() => {
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'in_progress' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001', mode: 'autopilot' },
      });
      createRunFolder('run-001');
    });

    it('should return success result', () => {
      const result: CompleteRunResult = completeRun(testRoot, 'run-001', validParams());

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-001');
      expect(result.workItemId).toBe('WI-001');
      expect(result.intentId).toBe('INT-001');
    });

    it('should return completedAt timestamp', () => {
      const before = new Date().toISOString();
      const result: CompleteRunResult = completeRun(testRoot, 'run-001', validParams());
      const after = new Date().toISOString();

      expect(result.completedAt).toBeDefined();
      expect(result.completedAt >= before).toBe(true);
      expect(result.completedAt <= after).toBe(true);
    });

    it('should return file counts', () => {
      const result: CompleteRunResult = completeRun(testRoot, 'run-001', validParams());

      expect(result.filesCreated).toBe(1);
      expect(result.filesModified).toBe(1);
      expect(result.testsAdded).toBe(5);
      expect(result.coverage).toBe(85);
    });

    it('should clear active_run in state.yaml', () => {
      completeRun(testRoot, 'run-001', validParams());

      const state = readStateFile() as { active_run: unknown };
      expect(state.active_run).toBeNull();
    });

    it('should record run in runs.completed history', () => {
      completeRun(testRoot, 'run-001', validParams());

      const state = readStateFile() as {
        runs: { completed: Array<{ id: string; work_item: string; intent: string; completed: string }> };
      };

      expect(state.runs).toBeDefined();
      expect(state.runs.completed).toBeDefined();
      expect(state.runs.completed.length).toBe(1);
      expect(state.runs.completed[0].id).toBe('run-001');
      expect(state.runs.completed[0].work_item).toBe('WI-001');
      expect(state.runs.completed[0].intent).toBe('INT-001');
    });

    it('should update work item status to completed', () => {
      completeRun(testRoot, 'run-001', validParams());

      const state = readStateFile() as {
        intents: Array<{ work_items: Array<{ id: string; status: string; run_id?: string }> }>;
      };
      const workItem = state.intents[0].work_items[0];

      expect(workItem.status).toBe('completed');
      expect(workItem.run_id).toBe('run-001');
    });

    it('should update run.md status to completed', () => {
      completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('status: completed');
    });

    it('should update run.md with completion timestamp', () => {
      const result: CompleteRunResult = completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain(`completed: ${result.completedAt}`);
    });

    it('should update run.md Files Created section', () => {
      completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('`src/new-file.ts`');
      expect(runLogContent).toContain('New feature implementation');
    });

    it('should update run.md Files Modified section', () => {
      completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('`src/existing.ts`');
      expect(runLogContent).toContain('Added import');
    });

    it('should update run.md Decisions section', () => {
      completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('Use pattern X');
      expect(runLogContent).toContain('Pattern X');
      expect(runLogContent).toContain('Better performance');
    });

    it('should add Summary section to run.md', () => {
      completeRun(testRoot, 'run-001', validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('## Summary');
      expect(runLogContent).toContain('Files created: 1');
      expect(runLogContent).toContain('Files modified: 1');
      expect(runLogContent).toContain('Tests added: 5');
      expect(runLogContent).toContain('Coverage: 85%');
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('edge cases', () => {
    beforeEach(() => {
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'in_progress' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });
      createRunFolder('run-001');
    });

    it('should handle empty arrays gracefully', () => {
      const params = {
        filesCreated: [],
        filesModified: [],
        decisions: [],
        testsAdded: 0,
        coverage: 0,
      };

      const result: CompleteRunResult = completeRun(testRoot, 'run-001', params);

      expect(result.success).toBe(true);

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('(none)');
    });

    it('should handle missing params with defaults', () => {
      const result: CompleteRunResult = completeRun(testRoot, 'run-001', {});

      expect(result.success).toBe(true);
      expect(result.filesCreated).toBe(0);
      expect(result.filesModified).toBe(0);
      expect(result.testsAdded).toBe(0);
      expect(result.coverage).toBe(0);
    });

    it('should preserve other state fields when updating', () => {
      createStateFile({
        project: { name: 'my-project', version: '1.0.0' },
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'in_progress' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
        custom_field: 'should be preserved',
      });

      completeRun(testRoot, 'run-001', validParams());

      const state = readStateFile() as { project: { name: string }; custom_field: string };
      expect(state.project.name).toBe('my-project');
      expect(state.custom_field).toBe('should be preserved');
    });

    it('should not duplicate runs in history when completing same run', () => {
      // Set up state with existing completed runs
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'in_progress' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
        runs: {
          completed: [
            { id: 'run-001', work_item: 'WI-001', intent: 'INT-001', completed: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      completeRun(testRoot, 'run-001', validParams());

      const state = readStateFile() as {
        runs: { completed: Array<{ id: string }> };
      };

      // Should still have only 1 entry (no duplicate)
      expect(state.runs.completed.length).toBe(1);
    });

    it('should append to existing completed runs history', () => {
      // Set up state with existing completed runs
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'in_progress' }],
          },
        ],
        active_run: { id: 'run-002', work_item: 'WI-001', intent: 'INT-001' },
        runs: {
          completed: [
            { id: 'run-001', work_item: 'WI-other', intent: 'INT-001', completed: '2024-01-01T00:00:00Z' },
          ],
        },
      });
      createRunFolder('run-002');

      completeRun(testRoot, 'run-002', validParams());

      const state = readStateFile() as {
        runs: { completed: Array<{ id: string }> };
      };

      // Should have 2 entries
      expect(state.runs.completed.length).toBe(2);
      expect(state.runs.completed[0].id).toBe('run-001');
      expect(state.runs.completed[1].id).toBe('run-002');
    });
  });
});
