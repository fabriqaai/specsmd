/**
 * Unit Tests for Placeholder Consistency
 *
 * Tests that templates use placeholder notation like {NNN}, {UUU}, {SSS}
 * instead of hardcoded values like 001, 002, etc.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs-extra';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const FLOWS_PATH = path.join(ROOT_DIR, 'flows/aidlc');

let templateFiles: string[] = [];
let skillFiles: string[] = [];

beforeAll(async () => {
  templateFiles = await glob(path.join(FLOWS_PATH, 'templates/**/*.md'));
  skillFiles = await glob(path.join(FLOWS_PATH, 'skills/**/*.md'));
});

describe('Flow Files - Placeholder Consistency', () => {

  describe('Templates should use placeholder notation', () => {
    it('should use {NNN} not hardcoded 001- in examples', async () => {
      const issues: string[] = [];

      for (const file of templateFiles) {
        const content = await fs.readFile(file, 'utf8');

        // Check for hardcoded intent patterns in YAML examples
        // Look for: intent: 001- or intent: "001- or intent: '001-
        const hardcodedIntentPattern = /intent:\s*['"]?00\d-/g;
        const matches = content.match(hardcodedIntentPattern);

        if (matches && matches.length > 0) {
          // Exclude example sections that should use concrete numbers
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (hardcodedIntentPattern.test(lines[i])) {
              // Check if we're in an Example section
              const beforeLines = lines.slice(Math.max(0, i - 20), i).join('\n');
              if (!beforeLines.includes('## Example')) {
                issues.push(`${path.relative(ROOT_DIR, file)}:${i + 1}: found hardcoded intent pattern, expected {NNN}-`);
              }
            }
          }
        }
      }

      if (issues.length > 0) {
        console.error('\nPlaceholder issues:\n' + issues.join('\n'));
      }

      expect(issues).toHaveLength(0);
    });

    it('should use {UUU} not hardcoded 001- for unit in examples', async () => {
      const issues: string[] = [];

      for (const file of templateFiles) {
        const content = await fs.readFile(file, 'utf8');

        // Check for hardcoded unit patterns (but not in Example sections)
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Match: unit: 001- or unit: "001-
          if (/unit:\s*['"]?00\d-/.test(line)) {
            const beforeLines = lines.slice(Math.max(0, i - 20), i).join('\n');
            if (!beforeLines.includes('## Example')) {
              issues.push(`${path.relative(ROOT_DIR, file)}:${i + 1}: found hardcoded unit pattern, expected {UUU}-`);
            }
          }
        }
      }

      if (issues.length > 0) {
        console.error('\nPlaceholder issues:\n' + issues.join('\n'));
      }

      expect(issues).toHaveLength(0);
    });

    it('should use {SSS} for story IDs in templates', async () => {
      const content = await fs.readFile(
        path.join(FLOWS_PATH, 'templates/inception/story-template.md'),
        'utf8'
      );

      // Template should teach the {SSS}-{title-slug} pattern
      expect(content).toMatch(/\{SSS\}-\{title-slug\}/);
    });

    it('should use {bolt-id} for bolt IDs in templates', async () => {
      const content = await fs.readFile(
        path.join(FLOWS_PATH, 'templates/construction/bolt-template.md'),
        'utf8'
      );

      // Template should teach the {bolt-id} placeholder pattern
      expect(content).toMatch(/\{bolt-id\}/);
    });
  });

  describe('Skills should use consistent placeholder names', () => {
    it('should use {bolt-id} consistently', async () => {
      const boltStartSkill = await fs.readFile(
        path.join(FLOWS_PATH, 'skills/construction/bolt-start.md'),
        'utf8'
      );

      // Should use {bolt-id} placeholder
      expect(boltStartSkill).toMatch(/\{bolt-id\}/g);
    });

    it('should use {intent} not {intent-name} in path references', async () => {
      // Skills use {intent} as path placeholder (matches folder name)
      const unitsSkill = await fs.readFile(
        path.join(FLOWS_PATH, 'skills/inception/units.md'),
        'utf8'
      );

      // Should use {intent} in path references
      expect(unitsSkill).toMatch(/\{intent\}/);
    });
  });
});
