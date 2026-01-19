/**
 * Unit tests for init-run.js
 *
 * Tests for initializing FIRE runs including:
 * - Input validation (rootPath, params)
 * - State file operations
 * - Run folder creation
 * - Active run detection
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
const { initRun } = require('../../../flows/fire/agents/builder/skills/run-execute/scripts/init-run.js');

// Helper type for the result
interface InitRunResult {
  success: boolean;
  runId: string;
  runPath: string;
  workItemId: string;
  intentId: string;
  mode: string;
  started: string;
}

// Helper type for errors with code
interface FireError extends Error {
  code: string;
  suggestion: string;
}

describe('init-run', () => {
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

  // ===========================================================================
  // Input Validation Tests
  // ===========================================================================

  describe('rootPath validation', () => {
    it('should throw when rootPath is null', () => {
      expect(() => initRun(null, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when rootPath is undefined', () => {
      expect(() => initRun(undefined, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when rootPath is not a string', () => {
      expect(() => initRun(123, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when rootPath is empty string', () => {
      expect(() => initRun('', 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when rootPath is whitespace only', () => {
      expect(() => initRun('   ', 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when rootPath does not exist', () => {
      expect(() => initRun('/nonexistent/path/abc123', 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should include error code in error message', () => {
      try {
        initRun(null, 'WI-001', 'INT-001', 'autopilot');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as FireError).code).toBeDefined();
        expect((error as FireError).message).toContain('INIT_');
      }
    });
  });

  describe('params validation', () => {
    beforeEach(() => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });
    });

    it('should throw when workItemId is null', () => {
      expect(() => initRun(testRoot, null, 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when workItemId is undefined', () => {
      expect(() => initRun(testRoot, undefined, 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when workItemId is empty', () => {
      expect(() => initRun(testRoot, '', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when intentId is null', () => {
      expect(() => initRun(testRoot, 'WI-001', null, 'autopilot')).toThrow();
    });

    it('should throw when intentId is empty', () => {
      expect(() => initRun(testRoot, 'WI-001', '', 'autopilot')).toThrow();
    });

    it('should throw when mode is null', () => {
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', null)).toThrow();
    });

    it('should throw when mode is invalid', () => {
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'invalid')).toThrow();
    });

    it('should accept valid mode: autopilot', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      expect(result.runId).toBe('run-001');
    });

    it('should accept valid mode: confirm', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'confirm');
      expect(result.runId).toBe('run-001');
    });

    it('should accept valid mode: validate', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'validate');
      expect(result.runId).toBe('run-001');
    });
  });

  // ===========================================================================
  // State File Tests
  // ===========================================================================

  describe('state file operations', () => {
    it('should throw when .specs-fire directory does not exist', () => {
      rmSync(specsFireDir, { recursive: true, force: true });
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when state.yaml does not exist', () => {
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when state.yaml contains invalid YAML', () => {
      writeFileSync(statePath, 'invalid: yaml: content: [', 'utf8');
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should throw when state.yaml is empty', () => {
      writeFileSync(statePath, '', 'utf8');
      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });
  });

  // ===========================================================================
  // Active Run Tests
  // ===========================================================================

  describe('active run detection', () => {
    it('should throw when active run already exists', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: {
          id: 'run-001',
          work_item: 'existing-wi',
          intent: 'existing-intent',
          mode: 'autopilot',
          started: '2024-01-01T00:00:00Z',
        },
      });

      expect(() => initRun(testRoot, 'WI-001', 'INT-001', 'autopilot')).toThrow();
    });

    it('should include existing run ID in error message', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: {
          id: 'run-existing',
          work_item: 'existing-wi',
          intent: 'existing-intent',
          mode: 'autopilot',
          started: '2024-01-01T00:00:00Z',
        },
      });

      try {
        initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as FireError).message).toContain('run-existing');
      }
    });

    it('should allow init when active_run is null', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });

      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      expect(result.runId).toBeDefined();
    });
  });

  // ===========================================================================
  // Run Creation Tests
  // ===========================================================================

  describe('run creation', () => {
    beforeEach(() => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });
    });

    it('should create run-001 for first run', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      expect(result.runId).toBe('run-001');
    });

    it('should increment run number based on existing runs', () => {
      // Create existing run folders
      mkdirSync(join(runsPath, 'run-001'));
      mkdirSync(join(runsPath, 'run-002'));

      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      expect(result.runId).toBe('run-003');
    });

    it('should handle gaps in run numbers (use max + 1)', () => {
      // Create non-consecutive run folders
      mkdirSync(join(runsPath, 'run-001'));
      mkdirSync(join(runsPath, 'run-005'));

      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      expect(result.runId).toBe('run-006');
    });

    it('should create run folder', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      const runPath = join(runsPath, result.runId);
      expect(existsSync(runPath)).toBe(true);
    });

    it('should create run.md in run folder', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      const runLogPath = join(runsPath, result.runId, 'run.md');
      expect(existsSync(runLogPath)).toBe(true);
    });

    it('should include correct metadata in run.md', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'confirm');
      const runLogPath = join(runsPath, result.runId, 'run.md');
      const content = readFileSync(runLogPath, 'utf8');

      expect(content).toContain('id: run-001');
      expect(content).toContain('work_item: WI-001');
      expect(content).toContain('intent: INT-001');
      expect(content).toContain('mode: confirm');
      expect(content).toContain('status: in_progress');
    });

    it('should update state.yaml with active_run', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');

      const state = readStateFile() as {
        active_run: {
          id: string;
          work_item: string;
          intent: string;
          mode: string;
        };
      };

      expect(state.active_run).toBeDefined();
      expect(state.active_run.id).toBe(result.runId);
      expect(state.active_run.work_item).toBe('WI-001');
      expect(state.active_run.intent).toBe('INT-001');
      expect(state.active_run.mode).toBe('autopilot');
    });

    it('should set started timestamp in ISO format', () => {
      const before = new Date().toISOString();

      initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');

      const after = new Date().toISOString();
      const state = readStateFile() as { active_run: { started: string } };

      expect(state.active_run.started).toBeDefined();
      expect(state.active_run.started >= before).toBe(true);
      expect(state.active_run.started <= after).toBe(true);
    });

    it('should return success result with all fields', () => {
      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-001');
      expect(result.runPath).toBe(join(runsPath, 'run-001'));
      expect(result.workItemId).toBe('WI-001');
      expect(result.intentId).toBe('INT-001');
      expect(result.mode).toBe('autopilot');
      expect(result.started).toBeDefined();
    });
  });

  // ===========================================================================
  // Run History Tests (New feature)
  // ===========================================================================

  describe('run history integration', () => {
    it('should use max from runs.completed when higher than file system', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
        runs: {
          completed: [
            { id: 'run-001', work_item: 'wi-1', intent: 'int-1', completed: '2024-01-01T00:00:00Z' },
            { id: 'run-010', work_item: 'wi-2', intent: 'int-1', completed: '2024-01-02T00:00:00Z' },
          ],
        },
      });

      // Only run-001 exists in file system
      mkdirSync(join(runsPath, 'run-001'));

      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      // Should be run-011 (max from history is 10)
      expect(result.runId).toBe('run-011');
    });

    it('should use max from file system when higher than history', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
        runs: {
          completed: [
            { id: 'run-001', work_item: 'wi-1', intent: 'int-1', completed: '2024-01-01T00:00:00Z' },
          ],
        },
      });

      // run-005 exists in file system
      mkdirSync(join(runsPath, 'run-001'));
      mkdirSync(join(runsPath, 'run-005'));

      const result: InitRunResult = initRun(testRoot, 'WI-001', 'INT-001', 'autopilot');
      // Should be run-006 (max from file system is 5)
      expect(result.runId).toBe('run-006');
    });
  });

  // ===========================================================================
  // Error Code Tests
  // ===========================================================================

  describe('error codes', () => {
    it('should use INIT_001 for null rootPath', () => {
      try {
        initRun(null, 'WI-001', 'INT-001', 'autopilot');
      } catch (error) {
        expect((error as FireError).code).toBe('INIT_001');
      }
    });

    it('should use INIT_010 for null workItemId', () => {
      createStateFile({ active_run: null, intents: [] });

      try {
        initRun(testRoot, null, 'INT-001', 'autopilot');
      } catch (error) {
        expect((error as FireError).code).toBe('INIT_010');
      }
    });

    it('should include suggestion in error message', () => {
      try {
        initRun(null, 'WI-001', 'INT-001', 'autopilot');
      } catch (error) {
        expect((error as FireError).suggestion).toBeDefined();
        expect((error as FireError).suggestion.length).toBeGreaterThan(0);
      }
    });
  });
});
