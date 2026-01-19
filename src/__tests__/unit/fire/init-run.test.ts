/**
 * Unit tests for init-run.ts
 *
 * Tests for initializing FIRE runs including:
 * - Input validation (rootPath, params)
 * - State file operations
 * - Run folder creation
 * - Active run detection
 * - Error handling with clear messages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

// Import the module under test
import {
  initRun,
  FireError,
} from '../../../flows/fire/agents/builder/skills/run-execute/scripts/init-run';

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
    it('should throw FireError when rootPath is null', () => {
      expect(() => initRun(null as unknown as string, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath is undefined', () => {
      expect(() => initRun(undefined as unknown as string, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath is not a string', () => {
      expect(() => initRun(123 as unknown as string, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath is empty string', () => {
      expect(() => initRun('', {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath is whitespace only', () => {
      expect(() => initRun('   ', {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath is relative path', () => {
      expect(() => initRun('./relative/path', {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when rootPath does not exist', () => {
      expect(() => initRun('/nonexistent/path/abc123', {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should include error code in FireError message', () => {
      try {
        initRun(null as unknown as string, {
          workItemId: 'WI-001',
          intentId: 'INT-001',
          mode: 'autopilot',
        });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FireError);
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

    it('should throw FireError when params is null', () => {
      expect(() => initRun(testRoot, null as unknown as { workItemId: string; intentId: string; mode: 'autopilot' }))
        .toThrow(FireError);
    });

    it('should throw FireError when params is undefined', () => {
      expect(() => initRun(testRoot, undefined as unknown as { workItemId: string; intentId: string; mode: 'autopilot' }))
        .toThrow(FireError);
    });

    it('should throw FireError when workItemId is missing', () => {
      expect(() => initRun(testRoot, {
        intentId: 'INT-001',
        mode: 'autopilot',
      } as { workItemId: string; intentId: string; mode: 'autopilot' })).toThrow(FireError);
    });

    it('should throw FireError when workItemId is empty', () => {
      expect(() => initRun(testRoot, {
        workItemId: '',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when intentId is missing', () => {
      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        mode: 'autopilot',
      } as { workItemId: string; intentId: string; mode: 'autopilot' })).toThrow(FireError);
    });

    it('should throw FireError when intentId is empty', () => {
      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: '',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when mode is missing', () => {
      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
      } as { workItemId: string; intentId: string; mode: 'autopilot' })).toThrow(FireError);
    });

    it('should throw FireError when mode is invalid', () => {
      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'invalid' as 'autopilot',
      })).toThrow(FireError);
    });

    it('should accept valid mode: autopilot', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBe('run-001');
    });

    it('should accept valid mode: confirm', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'confirm',
      });

      expect(runId).toBe('run-001');
    });

    it('should accept valid mode: validate', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'validate',
      });

      expect(runId).toBe('run-001');
    });
  });

  // ===========================================================================
  // State File Tests
  // ===========================================================================

  describe('state file operations', () => {
    it('should throw FireError when .specs-fire directory does not exist', () => {
      rmSync(specsFireDir, { recursive: true, force: true });

      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when state.yaml does not exist', () => {
      // Directory exists but no state.yaml
      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when state.yaml contains invalid YAML', () => {
      writeFileSync(statePath, 'invalid: yaml: content: [', 'utf8');

      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when state.yaml is empty', () => {
      writeFileSync(statePath, '', 'utf8');

      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });
  });

  // ===========================================================================
  // Active Run Tests
  // ===========================================================================

  describe('active run detection', () => {
    it('should throw FireError when active run already exists', () => {
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

      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
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
        initRun(testRoot, {
          workItemId: 'WI-001',
          intentId: 'INT-001',
          mode: 'autopilot',
        });
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

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBeDefined();
    });
  });

  // ===========================================================================
  // Intent/Work Item Validation Tests
  // ===========================================================================

  describe('intent and work item validation', () => {
    it('should throw FireError when intent does not exist', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [
          { id: 'other-intent', work_items: [] },
        ],
        active_run: null,
      });

      expect(() => initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'nonexistent-intent',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should throw FireError when work item does not exist in intent', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [
          {
            id: 'INT-001',
            work_items: [
              { id: 'WI-other', status: 'pending' },
            ],
          },
        ],
        active_run: null,
      });

      expect(() => initRun(testRoot, {
        workItemId: 'WI-nonexistent',
        intentId: 'INT-001',
        mode: 'autopilot',
      })).toThrow(FireError);
    });

    it('should allow init when intents array is empty (no validation)', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [],
        active_run: null,
      });

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBeDefined();
    });

    it('should allow init when intent has no work_items defined', () => {
      createStateFile({
        project: { name: 'test-project' },
        intents: [
          { id: 'INT-001' },
        ],
        active_run: null,
      });

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBeDefined();
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
      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBe('run-001');
    });

    it('should increment run number based on existing runs', () => {
      // Create existing run folders
      mkdirSync(join(runsPath, 'run-001'));
      mkdirSync(join(runsPath, 'run-002'));

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBe('run-003');
    });

    it('should handle gaps in run numbers (use max + 1)', () => {
      // Create non-consecutive run folders
      mkdirSync(join(runsPath, 'run-001'));
      mkdirSync(join(runsPath, 'run-005'));

      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      expect(runId).toBe('run-006');
    });

    it('should create run folder', () => {
      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      const runPath = join(runsPath, runId);
      expect(existsSync(runPath)).toBe(true);
    });

    it('should create run.md in run folder', () => {
      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      const runLogPath = join(runsPath, runId, 'run.md');
      expect(existsSync(runLogPath)).toBe(true);
    });

    it('should include correct metadata in run.md', () => {
      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'confirm',
      });

      const runLogPath = join(runsPath, runId, 'run.md');
      const content = readFileSync(runLogPath, 'utf8');

      expect(content).toContain('id: run-001');
      expect(content).toContain('work_item: WI-001');
      expect(content).toContain('intent: INT-001');
      expect(content).toContain('mode: confirm');
      expect(content).toContain('status: in_progress');
    });

    it('should update state.yaml with active_run', () => {
      const runId = initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      const state = readStateFile() as {
        active_run: {
          id: string;
          work_item: string;
          intent: string;
          mode: string;
        };
      };

      expect(state.active_run).toBeDefined();
      expect(state.active_run.id).toBe(runId);
      expect(state.active_run.work_item).toBe('WI-001');
      expect(state.active_run.intent).toBe('INT-001');
      expect(state.active_run.mode).toBe('autopilot');
    });

    it('should set started timestamp in ISO format', () => {
      const before = new Date().toISOString();

      initRun(testRoot, {
        workItemId: 'WI-001',
        intentId: 'INT-001',
        mode: 'autopilot',
      });

      const after = new Date().toISOString();
      const state = readStateFile() as { active_run: { started: string } };

      expect(state.active_run.started).toBeDefined();
      expect(state.active_run.started >= before).toBe(true);
      expect(state.active_run.started <= after).toBe(true);
    });
  });

  // ===========================================================================
  // Error Code Tests
  // ===========================================================================

  describe('error codes', () => {
    it('should use INIT_001 for null rootPath', () => {
      try {
        initRun(null as unknown as string, {
          workItemId: 'WI-001',
          intentId: 'INT-001',
          mode: 'autopilot',
        });
      } catch (error) {
        expect((error as FireError).code).toBe('INIT_001');
      }
    });

    it('should use INIT_010 for null params', () => {
      createStateFile({ active_run: null, intents: [] });

      try {
        initRun(testRoot, null as unknown as { workItemId: string; intentId: string; mode: 'autopilot' });
      } catch (error) {
        expect((error as FireError).code).toBe('INIT_010');
      }
    });

    it('should include suggestion in error message', () => {
      try {
        initRun(null as unknown as string, {
          workItemId: 'WI-001',
          intentId: 'INT-001',
          mode: 'autopilot',
        });
      } catch (error) {
        expect((error as FireError).suggestion).toBeDefined();
        expect((error as FireError).suggestion.length).toBeGreaterThan(0);
      }
    });
  });
});
