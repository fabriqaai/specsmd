/**
 * Unit Tests for Structure Validation
 *
 * Tests that flow files have required sections:
 * - Skills must have Goal, Input, Process sections
 * - Agents must have Persona, Skills sections
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs-extra';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const FLOWS_PATH = path.join(ROOT_DIR, 'flows/aidlc');

let skillFiles: string[] = [];
let agentFiles: string[] = [];

beforeAll(async () => {
  skillFiles = await glob(path.join(FLOWS_PATH, 'skills/**/*.md'));
  agentFiles = await glob(path.join(FLOWS_PATH, 'agents/**/*.md'));
});

describe('Flow Files - Structure Validation', () => {

  describe('All skill files should have required sections', () => {
    const REQUIRED_SECTIONS = ['## Goal', '## Input', '## Process'];

    it('should contain Goal, Input, Process sections', async () => {
      const missing: string[] = [];

      for (const file of skillFiles) {
        const content = await fs.readFile(file, 'utf8');
        const fileName = path.basename(file);

        for (const section of REQUIRED_SECTIONS) {
          if (!content.includes(section)) {
            missing.push(`${fileName}: missing "${section}" section`);
          }
        }
      }

      if (missing.length > 0) {
        console.error('\nMissing sections:\n' + missing.join('\n'));
      }

      expect(missing).toHaveLength(0);
    });
  });

  describe('All agent files should have required sections', () => {
    const REQUIRED_SECTIONS = ['## Persona', '## Skills'];

    it('should contain Persona, Skills sections', async () => {
      const missing: string[] = [];

      for (const file of agentFiles) {
        const content = await fs.readFile(file, 'utf8');
        const fileName = path.basename(file);

        for (const section of REQUIRED_SECTIONS) {
          if (!content.includes(section)) {
            missing.push(`${fileName}: missing "${section}" section`);
          }
        }
      }

      if (missing.length > 0) {
        console.error('\nMissing sections:\n' + missing.join('\n'));
      }

      expect(missing).toHaveLength(0);
    });
  });
});
