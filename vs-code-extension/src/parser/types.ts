/**
 * TypeScript interfaces and types for memory-bank artifact parsing.
 * These types represent the structure of AI-DLC artifacts.
 */

/**
 * Normalized artifact status.
 * Handles variations in status strings from frontmatter.
 */
export enum ArtifactStatus {
    Draft = 'draft',
    InProgress = 'in-progress',
    Complete = 'complete',
    Unknown = 'unknown'
}

/**
 * Represents a stage within a bolt.
 */
export interface Stage {
    name: string;
    order: number;
    status: ArtifactStatus;
}

/**
 * Represents a user story within a unit.
 */
export interface Story {
    /** Story number, e.g., "001" */
    id: string;
    /** Story title from filename or frontmatter */
    title: string;
    /** Parent unit name */
    unitName: string;
    /** Parent intent name */
    intentName: string;
    /** Full path to story file */
    path: string;
    /** Parsed status */
    status: ArtifactStatus;
    /** Priority: must, should, could */
    priority: string;
}

/**
 * Represents a unit (deployable work unit) within an intent.
 */
export interface Unit {
    /** Unit name from folder */
    name: string;
    /** Parent intent name */
    intentName: string;
    /** Full path to unit folder */
    path: string;
    /** Calculated status based on stories */
    status: ArtifactStatus;
    /** Child stories */
    stories: Story[];
}

/**
 * Represents an intent (feature/capability).
 */
export interface Intent {
    /** Intent name from folder (without number prefix) */
    name: string;
    /** Number prefix, e.g., "001" */
    number: string;
    /** Full path to intent folder */
    path: string;
    /** Parsed status from requirements.md or calculated */
    status: ArtifactStatus;
    /** Child units */
    units: Unit[];
}

/**
 * Represents a bolt (construction session).
 */
export interface Bolt {
    /** Bolt ID, e.g., "bolt-artifact-parser-1" */
    id: string;
    /** Unit this bolt belongs to */
    unit: string;
    /** Intent this bolt belongs to */
    intent: string;
    /** Bolt type: simple-construction-bolt, ddd-construction-bolt */
    type: string;
    /** Current bolt status */
    status: ArtifactStatus;
    /** Current stage name, null if not started */
    currentStage: string | null;
    /** All stages for this bolt type */
    stages: Stage[];
    /** Names of completed stages */
    stagesCompleted: string[];
    /** Story IDs included in this bolt */
    stories: string[];
    /** Full path to bolt folder */
    path: string;
}

/**
 * Represents a project standard.
 */
export interface Standard {
    /** Standard name from filename */
    name: string;
    /** Full path to standard file */
    path: string;
}

/**
 * Complete model of memory-bank contents.
 */
export interface MemoryBankModel {
    /** All intents with nested units and stories */
    intents: Intent[];
    /** All bolts */
    bolts: Bolt[];
    /** All standards */
    standards: Standard[];
    /** Whether this is a valid specsmd project */
    isProject: boolean;
}

/**
 * Parsed frontmatter data.
 * Keys are dynamic based on artifact type.
 */
export type FrontmatterData = Record<string, unknown>;

/**
 * Bolt type definitions for stage mapping.
 */
export const BOLT_TYPE_STAGES: Record<string, string[]> = {
    'simple-construction-bolt': ['plan', 'implement', 'test'],
    'ddd-construction-bolt': ['model', 'design', 'implement', 'test']
};
