/**
 * Unit tests for complete-run.ts
 *
 * Tests for completing FIRE runs including:
 * - Input validation (rootPath, params)
 * - State file validation
 * - Run log updates
 * - Work item status updates
 * - Warning generation for non-fatal issues
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

// Import the module under test
import { completeRun } from '../../../flows/fire/agents/builder/skills/run-execute/scripts/complete-run';

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
  function validParams(runId = 'run-001') {
    return {
      runId,
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
    it('should throw FIREError when rootPath is null', () => {
      expect(() => completeRun(null as unknown as string, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when rootPath is undefined', () => {
      expect(() => completeRun(undefined as unknown as string, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when rootPath is not a string', () => {
      expect(() => completeRun(123 as unknown as string, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when rootPath is empty string', () => {
      expect(() => completeRun('', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when rootPath does not exist', () => {
      expect(() => completeRun('/nonexistent/path/xyz', validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when rootPath is a file, not directory', () => {
      const filePath = join(testRoot, 'file.txt');
      writeFileSync(filePath, 'content');

      expect(() => completeRun(filePath, validParams()))
        .toThrow('FIRE Error');
    });
  });

  describe('params validation', () => {
    beforeEach(() => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });
      createRunFolder('run-001');
    });

    it('should throw FIREError when params is null', () => {
      expect(() => completeRun(testRoot, null as unknown as typeof validParams))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when params is undefined', () => {
      expect(() => completeRun(testRoot, undefined as unknown as typeof validParams))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when params is not an object', () => {
      expect(() => completeRun(testRoot, 'string' as unknown as typeof validParams))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when runId is missing', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).runId;

      expect(() => completeRun(testRoot, params as typeof validParams))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when runId is empty', () => {
      const params = { ...validParams(), runId: '' };

      expect(() => completeRun(testRoot, params))
        .toThrow('FIRE Error');
    });
  });

  // ===========================================================================
  // Project Structure Validation Tests
  // ===========================================================================

  describe('project structure validation', () => {
    it('should throw FIREError when .specs-fire directory does not exist', () => {
      rmSync(specsFireDir, { recursive: true, force: true });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when state.yaml does not exist', () => {
      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when runs directory does not exist', () => {
      createStateFile({ intents: [], active_run: null });
      rmSync(runsPath, { recursive: true, force: true });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when run folder does not exist', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when run.md does not exist', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });
      mkdirSync(join(runsPath, 'run-001'));

      expect(() => completeRun(testRoot, validParams()))
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

    it('should throw FIREError when no active run exists', () => {
      createStateFile({
        intents: [],
        active_run: null,
      });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when active_run.id does not match params.runId', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-002', work_item: 'WI-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, validParams('run-001')))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when active_run is missing id', () => {
      createStateFile({
        intents: [],
        active_run: { work_item: 'WI-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when active_run is missing work_item', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', intent: 'INT-001' },
      });

      expect(() => completeRun(testRoot, validParams()))
        .toThrow('FIRE Error');
    });

    it('should throw FIREError when active_run is missing intent', () => {
      createStateFile({
        intents: [],
        active_run: { id: 'run-001', work_item: 'WI-001' },
      });

      expect(() => completeRun(testRoot, validParams()))
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
      const result = completeRun(testRoot, validParams());

      expect(result.success).toBe(true);
      expect(result.runId).toBe('run-001');
      expect(result.workItemId).toBe('WI-001');
      expect(result.intentId).toBe('INT-001');
    });

    it('should return completedAt timestamp', () => {
      const before = new Date().toISOString();
      const result = completeRun(testRoot, validParams());
      const after = new Date().toISOString();

      expect(result.completedAt).toBeDefined();
      expect(result.completedAt >= before).toBe(true);
      expect(result.completedAt <= after).toBe(true);
    });

    it('should clear active_run in state.yaml', () => {
      completeRun(testRoot, validParams());

      const state = readStateFile() as { active_run: unknown };
      expect(state.active_run).toBeNull();
    });

    it('should update work item status to completed', () => {
      completeRun(testRoot, validParams());

      const state = readStateFile() as {
        intents: Array<{ work_items: Array<{ id: string; status: string; run_id?: string }> }>;
      };
      const workItem = state.intents[0].work_items[0];

      expect(workItem.status).toBe('completed');
      expect(workItem.run_id).toBe('run-001');
    });

    it('should update run.md status to completed', () => {
      completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('status: completed');
    });

    it('should update run.md with completion timestamp', () => {
      const result = completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain(`completed: ${result.completedAt}`);
    });

    it('should update run.md Files Created section', () => {
      completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('`src/new-file.ts`');
      expect(runLogContent).toContain('New feature implementation');
    });

    it('should update run.md Files Modified section', () => {
      completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('`src/existing.ts`');
      expect(runLogContent).toContain('Added import');
    });

    it('should update run.md Decisions section', () => {
      completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('Use pattern X');
      expect(runLogContent).toContain('Pattern X');
      expect(runLogContent).toContain('Better performance');
    });

    it('should add Summary section to run.md', () => {
      completeRun(testRoot, validParams());

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('## Summary');
      expect(runLogContent).toContain('Files created: 1');
      expect(runLogContent).toContain('Files modified: 1');
      expect(runLogContent).toContain('Tests added: 5');
      expect(runLogContent).toContain('Coverage: 85%');
    });
  });

  // ===========================================================================
  // Warning Generation Tests
  // ===========================================================================

  describe('warning generation', () => {
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

    it('should generate warning when filesCreated is not provided', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).filesCreated;

      const result = completeRun(testRoot, params as typeof validParams);

      expect(result.warnings).toContain('filesCreated was not provided, defaulting to empty array');
    });

    it('should generate warning when filesModified is not provided', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).filesModified;

      const result = completeRun(testRoot, params as typeof validParams);

      expect(result.warnings.some(w => w.includes('filesModified'))).toBe(true);
    });

    it('should generate warning when decisions is not provided', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).decisions;

      const result = completeRun(testRoot, params as typeof validParams);

      expect(result.warnings.some(w => w.includes('decisions'))).toBe(true);
    });

    it('should generate warning when testsAdded is not provided', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).testsAdded;

      const result = completeRun(testRoot, params as typeof validParams);

      expect(result.warnings.some(w => w.includes('testsAdded'))).toBe(true);
    });

    it('should generate warning when coverage is not provided', () => {
      const params = { ...validParams() };
      delete (params as Record<string, unknown>).coverage;

      const result = completeRun(testRoot, params as typeof validParams);

      expect(result.warnings.some(w => w.includes('coverage'))).toBe(true);
    });

    it('should generate warning when coverage exceeds 100', () => {
      const params = { ...validParams(), coverage: 150 };

      const result = completeRun(testRoot, params);

      expect(result.warnings.some(w => w.includes('greater than 100'))).toBe(true);
    });

    it('should clamp coverage to 100 when it exceeds', () => {
      const params = { ...validParams(), coverage: 150 };

      completeRun(testRoot, params);

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('Coverage: 100%');
    });

    it('should generate warning when filesCreated entry is missing path', () => {
      const params = {
        ...validParams(),
        filesCreated: [{ purpose: 'No path here' } as { path: string; purpose: string }],
      };

      const result = completeRun(testRoot, params);

      expect(result.warnings.some(w => w.includes('filesCreated') && w.includes('path'))).toBe(true);
    });

    it('should generate warning when intent not found in state', () => {
      createStateFile({
        intents: [
          {
            id: 'OTHER-INTENT',
            work_items: [],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });

      const result = completeRun(testRoot, validParams());

      expect(result.warnings.some(w => w.includes('Intent') && w.includes('not found'))).toBe(true);
    });

    it('should generate warning when work item not found in intent', () => {
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'OTHER-WI', status: 'pending' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });

      const result = completeRun(testRoot, validParams());

      expect(result.warnings.some(w => w.includes('Work item') && w.includes('not found'))).toBe(true);
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
        runId: 'run-001',
        filesCreated: [],
        filesModified: [],
        decisions: [],
        testsAdded: 0,
        coverage: 0,
      };

      const result = completeRun(testRoot, params);

      expect(result.success).toBe(true);

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('(none)');
    });

    it('should handle negative testsAdded (defaults to 0)', () => {
      const params = { ...validParams(), testsAdded: -5 };

      const result = completeRun(testRoot, params);

      expect(result.warnings.some(w => w.includes('testsAdded') && w.includes('negative'))).toBe(true);

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('Tests added: 0');
    });

    it('should handle negative coverage (defaults to 0)', () => {
      const params = { ...validParams(), coverage: -10 };

      const result = completeRun(testRoot, params);

      expect(result.warnings.some(w => w.includes('coverage') && w.includes('negative'))).toBe(true);

      const runLogContent = readFileSync(join(runsPath, 'run-001', 'run.md'), 'utf8');
      expect(runLogContent).toContain('Coverage: 0%');
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

      completeRun(testRoot, validParams());

      const state = readStateFile() as { project: { name: string }; custom_field: string };
      expect(state.project.name).toBe('my-project');
      expect(state.custom_field).toBe('should be preserved');
    });

    it('should generate warning when work item already completed', () => {
      createStateFile({
        intents: [
          {
            id: 'INT-001',
            work_items: [{ id: 'WI-001', status: 'completed' }],
          },
        ],
        active_run: { id: 'run-001', work_item: 'WI-001', intent: 'INT-001' },
      });

      const result = completeRun(testRoot, validParams());

      expect(result.warnings.some(w => w.includes('already marked as completed'))).toBe(true);
    });
  });
});
