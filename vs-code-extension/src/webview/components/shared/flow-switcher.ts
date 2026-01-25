/**
 * FlowSwitcher - Component for switching between detected flows.
 *
 * Displays at the bottom of the sidebar when multiple flows are detected.
 * Clicking opens the VS Code quick pick for flow selection.
 */

import { html, css, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Flow information for display.
 */
export interface FlowInfo {
    id: string;
    displayName: string;
    icon: string;
    rootFolder: string;
}

/**
 * Event detail for flow switch request.
 */
export interface FlowSwitchDetail {
    flowId?: string;
}

/**
 * Flow switcher component.
 * Simplified: clicking triggers VS Code quick pick instead of custom dropdown.
 */
@customElement('flow-switcher')
export class FlowSwitcher extends LitElement {
    /**
     * Currently active flow.
     */
    @property({ type: Object })
    activeFlow: FlowInfo | null = null;

    /**
     * Available flows to switch between.
     */
    @property({ type: Array })
    availableFlows: FlowInfo[] = [];

    static styles = css`
        :host {
            display: block;
            --switcher-bg: var(--vscode-sideBarSectionHeader-background, #252526);
            --switcher-border: var(--vscode-sideBarSectionHeader-border, #3c3c3c);
            --switcher-hover: var(--vscode-list-hoverBackground, #2a2d2e);
            --switcher-text: var(--vscode-foreground, #cccccc);
            --switcher-muted: var(--vscode-descriptionForeground, #8b8b8b);
        }

        .switcher-container {
            border-top: 1px solid var(--switcher-border);
            background: var(--switcher-bg);
        }

        .switcher-button {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 10px 12px;
            border: none;
            background: transparent;
            color: var(--switcher-text);
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 11px;
            text-align: left;
            transition: background 0.15s ease;
        }

        .switcher-button:hover {
            background: var(--switcher-hover);
        }

        .switcher-button:focus {
            outline: none;
            background: var(--switcher-hover);
        }

        .switcher-button:active {
            background: var(--vscode-list-activeSelectionBackground, #094771);
        }

        .switcher-button:disabled {
            cursor: default;
        }

        .switcher-button:disabled:hover {
            background: transparent;
        }

        .flow-icon {
            font-size: 14px;
            flex-shrink: 0;
        }

        .flow-info {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        .flow-name {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .flow-hint {
            font-size: 9px;
            color: var(--switcher-muted);
            margin-top: 2px;
        }

        .switch-indicator {
            font-size: 8px;
            color: var(--switcher-muted);
            padding: 2px 6px;
            background: var(--vscode-badge-background, #4d4d4d);
            border-radius: 3px;
        }

        /* Hide when only one flow */
        :host([hidden]) {
            display: none;
        }
    `;

    render() {
        const activeFlow = this.activeFlow || this.availableFlows[0];
        const flowCount = this.availableFlows.length;
        const hasMultipleFlows = flowCount > 1;

        return html`
            <div class="switcher-container">
                <button
                    class="switcher-button"
                    @click=${this._handleClick}
                    title="${hasMultipleFlows ? 'Click to switch flow (Ctrl+Cmd+F)' : 'Current flow'}"
                    ?disabled=${!hasMultipleFlows}
                >
                    <span class="flow-icon">${activeFlow?.icon || '🔥'}</span>
                    <span class="flow-info">
                        <span class="flow-name">${activeFlow?.displayName || 'FIRE'}</span>
                        <span class="flow-hint">${flowCount > 0 ? `${flowCount} flow${flowCount > 1 ? 's' : ''} available` : 'No flow detected'}</span>
                    </span>
                    ${hasMultipleFlows ? html`<span class="switch-indicator">Switch</span>` : ''}
                </button>
            </div>
        `;
    }

    /**
     * Handle click - dispatch event to trigger VS Code quick pick.
     */
    private _handleClick = (): void => {
        // Dispatch event without flowId to trigger quick pick in extension
        this.dispatchEvent(new CustomEvent<FlowSwitchDetail>('flow-switch', {
            detail: {},
            bubbles: true,
            composed: true
        }));
    };
}

declare global {
    interface HTMLElementTagNameMap {
        'flow-switcher': FlowSwitcher;
    }
}
