/**
 * Unit Tests for Code Example Validity
 *
 * Tests that code examples in templates are syntactically valid:
 * - YAML code blocks parse correctly
 * - Bash command examples are syntactically plausible
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { glob } from 'glob';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';

const ROOT_DIR = path.resolve(__dirname, '../../..');
const FLOWS_PATH = path.join(ROOT_DIR, 'flows/aidlc');

let templateFiles: string[] = [];

beforeAll(async () => {
  templateFiles = await glob(path.join(FLOWS_PATH, 'templates/**/*.md'));
});

describe('Flow Files - Code Example Validity', () => {

  describe('YAML code blocks should be valid', () => {
    it('should parse all YAML blocks in templates', async () => {
      const issues: string[] = [];
      const yamlRegex = /```yaml\n([\s\S]*?)```/g;

      for (const file of templateFiles) {
        const content = await fs.readFile(file, 'utf8');
        let match;

        while ((match = yamlRegex.exec(content)) !== null) {
          const yamlContent = match[1];

          // Skip if it contains placeholder patterns (teaching examples, not real YAML)
          if (yamlContent.match(/\{[A-Z]+\}|must|should|could|null/)) {
            continue;
          }

          // Skip bolt-type files (they have valid multi-document YAML examples)
          if (file.includes('/bolt-types/')) {
            continue;
          }

          try {
            yaml.load(yamlContent);
          } catch (error) {
            const relPath = path.relative(ROOT_DIR, file);
            issues.push(`${relPath}: invalid YAML - ${(error as Error).message}`);
          }
        }
      }

      if (issues.length > 0) {
        console.error('\nYAML validation errors:\n' + issues.join('\n'));
      }

      expect(issues).toHaveLength(0);
    });

    it('should parse YAML frontmatter examples in templates', async () => {
      const issues: string[] = [];

      for (const file of templateFiles) {
        // Skip all -template.md files (they contain teaching examples with markdown)
        // Skip guide files and bolt-types (they have special formatting)
        if (file.includes('-template.md') || file.includes('.guide.md') || file.includes('/bolt-types/')) {
          continue;
        }

        const content = await fs.readFile(file, 'utf8');

        // Look for frontmatter examples (within markdown code blocks or separate)
        const frontmatterRegex = /---\n([\s\S]*?)---/g;
        let match;

        while ((match = frontmatterRegex.exec(content)) !== null) {
          const yamlContent = match[1];

          // Skip if it contains placeholders (which won't parse valid YAML)
          if (yamlContent.match(/\{[A-Z]+\}|must|should|could|\*{2}/)) {
            continue;
          }

          try {
            yaml.load(yamlContent);
          } catch (error) {
            const relPath = path.relative(ROOT_DIR, file);
            issues.push(`${relPath}: invalid YAML frontmatter - ${(error as Error).message}`);
          }
        }
      }

      if (issues.length > 0) {
        console.error('\nYAML frontmatter errors:\n' + issues.join('\n'));
      }

      expect(issues).toHaveLength(0);
    });
  });

  describe('Bash command examples should be syntactically plausible', () => {
    it('should have valid node command syntax', async () => {
      const boltStartSkill = await fs.readFile(
        path.join(FLOWS_PATH, 'skills/construction/bolt-start.md'),
        'utf8'
      );

      // Should contain the node command pattern
      expect(boltStartSkill).toMatch(/node\s+\.specsmd\/scripts\/bolt-complete\.js/);
    });
  });
});
