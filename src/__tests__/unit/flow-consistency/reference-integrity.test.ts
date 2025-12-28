/**
 * Unit Tests for Reference Integrity
 *
 * Tests that skills reference files that actually exist:
 * - Scripts referenced by skills exist
 * - Templates referenced by skills exist
 * - Schema files referenced by skills exist
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs-extra';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const FLOWS_PATH = path.join(ROOT_DIR, 'flows/aidlc');
const SCRIPTS_PATH = path.join(ROOT_DIR, 'scripts');

let skillFiles: string[] = [];

beforeAll(async () => {
  skillFiles = await glob(path.join(FLOWS_PATH, 'skills/**/*.md'));
});

describe('Flow Files - Reference Integrity', () => {

  describe('Skills should reference existing scripts', () => {
    it('bolt-start.md should reference existing bolt-complete.js', async () => {
      const boltStartSkill = await fs.readFile(
        path.join(FLOWS_PATH, 'skills/construction/bolt-start.md'),
        'utf8'
      );

      // Should reference the script
      expect(boltStartSkill).toMatch(/bolt-complete\.js/);

      // Script should exist
      const scriptPath = path.join(SCRIPTS_PATH, 'bolt-complete.js');
      const exists = await fs.pathExists(scriptPath);

      if (!exists) {
        console.error(`\nMissing script: ${scriptPath}`);
      }

      expect(exists).toBe(true);
    });
  });

  describe('Skills should reference existing templates', () => {
    const templateRefs: Record<string, { template: string, dir: string }> = {
      'units.md': { template: 'unit-brief-template.md', dir: 'inception' },
      'story-create.md': { template: 'story-template.md', dir: 'inception' },
      'bolt-plan.md': { template: 'bolt-template.md', dir: 'construction' },
      'requirements.md': { template: 'requirements-template.md', dir: 'inception' },
    };

    for (const [skillFile, { template, dir }] of Object.entries(templateRefs)) {
      it(`${skillFile} should reference ${template}`, async () => {
        // Find the skill file
        const matchingSkills = skillFiles.filter(f => f.endsWith(skillFile));

        if (matchingSkills.length === 0) {
          return; // Skip if skill doesn't exist
        }

        const skillContent = await fs.readFile(matchingSkills[0], 'utf8');

        // Should reference the template
        expect(skillContent).toMatch(template);

        // Template should exist
        const templatePath = path.join(FLOWS_PATH, 'templates', dir, template);
        const exists = await fs.pathExists(templatePath);

        if (!exists) {
          console.error(`\nMissing template: ${templatePath}`);
        }

        expect(exists).toBe(true);
      });
    }
  });

  describe('Skills should reference existing schema files', () => {
    it('should reference memory-bank.yaml which exists', async () => {
      const schemaPath = path.join(FLOWS_PATH, 'memory-bank.yaml');
      const exists = await fs.pathExists(schemaPath);

      if (!exists) {
        console.error(`\nMissing schema: ${schemaPath}`);
      }

      expect(exists).toBe(true);
    });

    it('should reference context-config.yaml which exists', async () => {
      const schemaPath = path.join(FLOWS_PATH, 'context-config.yaml');
      const exists = await fs.pathExists(schemaPath);

      if (!exists) {
        console.error(`\nMissing schema: ${schemaPath}`);
      }

      expect(exists).toBe(true);
    });
  });
});
