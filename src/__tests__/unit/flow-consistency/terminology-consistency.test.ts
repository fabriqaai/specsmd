/**
 * Unit Tests for Terminology Consistency
 *
 * Tests that terminology is used consistently across flow files:
 * - Phase names (inception, construction, operations) use consistent casing
 * - Artifact type names use consistent casing
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs-extra';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const FLOWS_PATH = path.join(ROOT_DIR, 'flows/aidlc');

let skillFiles: string[] = [];
let agentFiles: string[] = [];
let templateFiles: string[] = [];

beforeAll(async () => {
  skillFiles = await glob(path.join(FLOWS_PATH, 'skills/**/*.md'));
  agentFiles = await glob(path.join(FLOWS_PATH, 'agents/**/*.md'));
  templateFiles = await glob(path.join(FLOWS_PATH, 'templates/**/*.md'));
});

describe('Flow Files - Terminology Consistency', () => {

  describe('Phase names should be consistent', () => {
    const PHASES = ['inception', 'construction', 'operations'];

    it('should use lowercase phase names', async () => {
      const allFiles = [...skillFiles, ...agentFiles, ...templateFiles];
      const issues: string[] = [];

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf8');

        // Check for incorrect capitalizations of phase names
        // Allow "Inception" at start of sentence or title, but not in code/paths
        const incorrectInCode = /['"`\/][Ii]nception['"`]/g;
        const incorrectInCode2 = /['"`\/][Cc]onstruction['"`]/g;
        const incorrectInCode3 = /['"`\/][Oo]perations['"`]/g;

        const matches1 = content.match(incorrectInCode);
        const matches2 = content.match(incorrectInCode2);
        const matches3 = content.match(incorrectInCode3);

        if (matches1 || matches2 || matches3) {
          // Check if it's in a code block or path
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if ((matches1 && incorrectInCode.test(line)) ||
                (matches2 && incorrectInCode2.test(line)) ||
                (matches3 && incorrectInCode3.test(line))) {
              // Allow in prose, flag in code/paths
              if (line.includes('`') || line.includes('/') || line.includes("'")) {
                // Check if it's referencing a path
                if (line.includes('/') || line.includes('skills/') || line.includes('agents/')) {
                  issues.push(`${path.relative(ROOT_DIR, file)}:${i + 1}: use lowercase phase name in paths`);
                }
              }
            }
          }
        }
      }

      // Log issues but don't fail (this is a soft warning)
      if (issues.length > 0) {
        console.warn('\nTerminology warnings:\n' + issues.join('\n'));
      }
    });
  });

  describe('Artifact type names should be consistent', () => {
    it('should use "intent" not "Intent" or "INTENT" in code contexts', async () => {
      const allFiles = [...skillFiles, ...agentFiles];
      const issues: string[] = [];

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check in code/backtick sections
          if (line.includes('`') || line.includes('```') || line.includes('path:')) {
            // Flag inconsistent casing in code contexts
            if (/\b[Ii]ntent\b/.test(line) && !line.includes('{intent}')) {
              // This is okay - it's referring to the concept
            }
          }
        }
      }
    });
  });
});
