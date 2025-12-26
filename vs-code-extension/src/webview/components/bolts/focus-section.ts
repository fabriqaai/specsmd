/**
 * FocusSection - Current Focus section wrapper.
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../shared/base-element.js';
import './focus-card.js';
import type { ActiveBoltData } from './focus-card.js';

/**
 * Focus section component.
 *
 * @fires toggle-expand - When focus card is toggled
 *
 * @example
 * ```html
 * <focus-section .bolt=${bolt} expanded></focus-section>
 * ```
 */
@customElement('focus-section')
export class FocusSection extends BaseElement {
    /**
     * Active bolt data (null if no active bolt).
     */
    @property({ type: Object })
    bolt: ActiveBoltData | null = null;

    /**
     * Whether the focus card is expanded.
     */
    @property({ type: Boolean })
    expanded = false;

    static styles = [
        ...BaseElement.baseStyles,
        css`
            :host {
                display: block;
                padding: 16px;
                background: var(--vscode-sideBar-background, #252526);
            }

            .label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 11px;
                font-weight: 600;
                color: var(--description-foreground, #858585);
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-bottom: 12px;
            }

            .label-icon {
                font-size: 14px;
            }

            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                padding: 32px 16px;
                text-align: center;
                color: var(--description-foreground, #858585);
            }

            .empty-state-icon {
                font-size: 32px;
                margin-bottom: 4px;
            }

            .empty-state-text {
                font-size: 13px;
                line-height: 1.5;
            }

            .empty-state code {
                background: var(--vscode-input-background, #3c3c3c);
                padding: 4px 10px;
                border-radius: 4px;
                font-family: var(--vscode-editor-font-family, monospace);
                font-size: 11px;
            }
        `
    ];

    render() {
        return html`
            <div class="label">
                <span class="label-icon">🎯</span>
                Current Focus
            </div>
            ${this.bolt
                ? html`
                    <focus-card
                        .bolt=${this.bolt}
                        .expanded=${this.expanded}>
                    </focus-card>
                `
                : html`
                    <div class="empty-state">
                        <span class="empty-state-icon">🚀</span>
                        <span class="empty-state-text">No active bolt — run <code>/specsmd-construction-agent</code> to start</span>
                    </div>
                `
            }
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'focus-section': FocusSection;
    }
}
