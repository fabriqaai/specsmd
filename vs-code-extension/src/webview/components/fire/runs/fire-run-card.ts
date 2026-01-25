/**
 * FireRunCard - Card displaying a run's details.
 */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BaseElement } from '../../shared/base-element.js';
import './fire-work-item.js';
import '../shared/fire-scope-badge.js';
import type { RunWorkItemData } from './fire-work-item.js';
import type { RunScope } from '../shared/fire-scope-badge.js';
import type { RunFileData } from './fire-completed-runs.js';

/**
 * Run data for display.
 */
export interface FireRunData {
    id: string;
    scope: RunScope;
    workItems: RunWorkItemData[];
    currentItem: string | null;
    folderPath: string;
    startedAt: string;
    completedAt?: string;
    hasPlan: boolean;
    hasWalkthrough: boolean;
    hasTestReport: boolean;
    files?: RunFileData[];
}

/**
 * Run card component showing run details and work items.
 *
 * @fires view-artifact - When artifact button is clicked
 * @fires open-file - When work item is clicked
 *
 * @example
 * ```html
 * <fire-run-card .run=${run} ?isActive=${true}></fire-run-card>
 * ```
 */
@customElement('fire-run-card')
export class FireRunCard extends BaseElement {
    /**
     * Run data.
     */
    @property({ type: Object })
    run!: FireRunData;

    /**
     * Whether this is the active run.
     */
    @property({ type: Boolean })
    isActive = false;

    /**
     * Whether work items list is expanded.
     */
    @state()
    private _expanded = true;

    static styles = [
        ...BaseElement.baseStyles,
        css`
            :host {
                display: block;
            }

            .card {
                background: var(--editor-background);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                overflow: hidden;
            }

            .card.active {
                border-color: var(--status-active);
                box-shadow: 0 0 0 1px rgba(249, 115, 22, 0.2);
            }

            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px;
                border-bottom: 1px solid var(--border-color);
            }

            .header-left {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .run-id {
                font-size: 13px;
                font-weight: 600;
                color: var(--foreground);
            }

            .item-count {
                font-size: 11px;
                color: var(--description-foreground);
            }

            .work-items-section {
                padding: 8px;
            }

            .section-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 4px 8px;
                cursor: pointer;
            }

            .section-title {
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
                color: var(--description-foreground);
                letter-spacing: 0.5px;
            }

            .toggle-icon {
                font-size: 10px;
                color: var(--description-foreground);
                transition: transform 0.15s ease;
            }

            .toggle-icon.collapsed {
                transform: rotate(-90deg);
            }

            .work-items-list {
                margin-top: 4px;
            }

            .files-section {
                padding: 8px 12px;
                border-top: 1px solid var(--border-color);
            }

            .files-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }

            .files-title {
                font-size: 10px;
                font-weight: 500;
                text-transform: uppercase;
                color: var(--description-foreground);
                letter-spacing: 0.5px;
            }

            .files-list {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .file-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 4px 8px;
                cursor: pointer;
                border-radius: 3px;
                transition: background 0.15s ease;
            }

            .file-item:hover {
                background: var(--background);
            }

            .file-icon {
                font-size: 12px;
                color: var(--description-foreground);
            }

            .file-name {
                font-size: 11px;
                color: var(--foreground);
            }

            .no-files {
                font-size: 11px;
                color: var(--description-foreground);
                font-style: italic;
            }
        `
    ];

    render() {
        if (!this.run) return nothing;

        const completedCount = this.run.workItems.filter(w => w.status === 'completed').length;

        return html`
            <div class="card ${this.isActive ? 'active' : ''}">
                <div class="header">
                    <div class="header-left">
                        <span class="run-id">${this.run.id}</span>
                        <fire-scope-badge scope=${this.run.scope}></fire-scope-badge>
                    </div>
                    <span class="item-count">${completedCount}/${this.run.workItems.length} items</span>
                </div>

                <div class="work-items-section">
                    <div class="section-header" @click=${this._toggleExpanded}>
                        <span class="section-title">Work Items</span>
                        <span class="toggle-icon ${this._expanded ? '' : 'collapsed'}">▼</span>
                    </div>
                    ${this._expanded ? html`
                        <div class="work-items-list">
                            ${this.run.workItems.map(item => html`
                                <fire-work-item
                                    .item=${item}
                                    ?isCurrent=${item.id === this.run.currentItem}
                                    @open-file=${this._forwardOpenFile}
                                ></fire-work-item>
                            `)}
                        </div>
                    ` : nothing}
                </div>

                ${this._renderFilesSection()}
            </div>
        `;
    }

    private _toggleExpanded(): void {
        this._expanded = !this._expanded;
    }

    private _renderFilesSection() {
        const files = this.run.files || [];

        if (files.length === 0) {
            return nothing;
        }

        return html`
            <div class="files-section">
                <div class="files-header">
                    <span class="files-title">Run Files</span>
                </div>
                <div class="files-list">
                    ${files.map(file => html`
                        <div class="file-item" @click=${() => this._handleFileClick(file)}>
                            <span class="file-icon">${this._getFileIcon(file.name)}</span>
                            <span class="file-name">${file.name}</span>
                        </div>
                    `)}
                </div>
            </div>
        `;
    }

    private _getFileIcon(fileName: string): string {
        if (fileName.includes('plan')) return '📋';
        if (fileName.includes('test')) return '🧪';
        if (fileName.includes('walkthrough')) return '📝';
        if (fileName.includes('run')) return '🔥';
        return '📄';
    }

    private _handleFileClick(file: RunFileData): void {
        this.dispatchEvent(new CustomEvent('open-file', {
            detail: { path: file.path },
            bubbles: true,
            composed: true
        }));
    }

    private _forwardOpenFile(e: CustomEvent): void {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('open-file', {
            detail: e.detail,
            bubbles: true,
            composed: true
        }));
    }

    private _handleViewArtifact(artifact: 'plan' | 'test-report' | 'walkthrough'): void {
        this.dispatchEvent(new CustomEvent('view-artifact', {
            detail: { runId: this.run.id, artifact },
            bubbles: true,
            composed: true
        }));
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'fire-run-card': FireRunCard;
    }
}
