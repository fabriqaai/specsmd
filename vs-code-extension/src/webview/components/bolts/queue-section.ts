/**
 * QueueSection - Up Next queue section.
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../shared/base-element.js';
import './queue-item.js';
import type { QueuedBoltData } from './queue-item.js';

/**
 * Queue section component.
 *
 * @fires start-bolt - When Start button is clicked on a queue item
 *
 * @example
 * ```html
 * <queue-section .bolts=${bolts}></queue-section>
 * ```
 */
@customElement('queue-section')
export class QueueSection extends BaseElement {
    /**
     * Array of queued bolts.
     */
    @property({ type: Array })
    bolts: QueuedBoltData[] = [];

    static styles = [
        ...BaseElement.baseStyles,
        css`
            :host {
                display: block;
                padding: 20px 16px;
                border-top: 1px solid var(--vscode-input-border, #3c3c3c);
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .title {
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: var(--description-foreground, #858585);
            }

            .count {
                font-size: 11px;
                font-weight: 500;
                padding: 4px 12px;
                border-radius: 12px;
                background: var(--vscode-input-background, #3c3c3c);
                color: var(--foreground, #cccccc);
            }

            .list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .empty-state {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                color: var(--description-foreground, #858585);
                font-size: 12px;
            }
        `
    ];

    render() {
        return html`
            <div class="header">
                <span class="title">Up Next</span>
                <span class="count">${this.bolts.length} bolts</span>
            </div>
            <div class="list">
                ${this.bolts.length > 0
                    ? this.bolts.slice(0, 5).map((bolt, idx) => html`
                        <queue-item
                            .bolt=${bolt}
                            .priority=${idx + 1}
                            class=${bolt.isBlocked ? 'blocked' : ''}>
                        </queue-item>
                    `)
                    : html`<div class="empty-state">Queue empty</div>`
                }
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'queue-section': QueueSection;
    }
}
