/**
 * MissionStatus - Current intent with statistics.
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../shared/base-element.js';

/**
 * Intent info.
 */
export interface IntentInfo {
    name: string;
    number: string;
}

/**
 * Bolt statistics.
 */
export interface BoltStats {
    active: number;
    queued: number;
    done: number;
    blocked: number;
}

/**
 * Mission status component.
 *
 * @example
 * ```html
 * <mission-status .intent=${intent} .stats=${stats}></mission-status>
 * ```
 */
@customElement('mission-status')
export class MissionStatus extends BaseElement {
    /**
     * Current intent info.
     */
    @property({ type: Object })
    intent: IntentInfo | null = null;

    /**
     * Bolt statistics.
     */
    @property({ type: Object })
    stats: BoltStats = { active: 0, queued: 0, done: 0, blocked: 0 };

    static styles = [
        ...BaseElement.baseStyles,
        css`
            :host {
                display: block;
                padding: 16px;
                background: linear-gradient(135deg, var(--vscode-sideBar-background, #252526) 0%, rgba(249, 115, 22, 0.05) 100%);
                border-top: 3px solid #f97316;
            }

            .label {
                font-size: 11px;
                font-weight: 600;
                color: #f97316;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                margin-bottom: 6px;
            }

            .title {
                font-size: 17px;
                font-weight: 700;
                color: var(--foreground, #cccccc);
                margin-bottom: 14px;
                line-height: 1.2;
            }

            .stats {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
            }

            .stat {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .stat-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .stat-dot.active {
                background: #f97316;
            }

            .stat-dot.queued {
                background: #6b7280;
            }

            .stat-dot.done {
                background: #22c55e;
            }

            .stat-dot.blocked {
                background: #ef4444;
            }

            .stat-value {
                font-size: 14px;
                font-weight: 700;
                color: var(--foreground, #cccccc);
            }

            .stat-label {
                font-size: 12px;
                color: var(--description-foreground, #858585);
            }
        `
    ];

    render() {
        if (!this.intent) {
            return html`
                <div class="label">Current Intent</div>
                <div class="title">No intents found</div>
            `;
        }

        return html`
            <div class="label">Current Intent</div>
            <div class="title">${this.intent.number}-${this.intent.name}</div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-dot active"></div>
                    <span class="stat-value">${this.stats.active}</span>
                    <span class="stat-label">In Progress</span>
                </div>
                <div class="stat">
                    <div class="stat-dot queued"></div>
                    <span class="stat-value">${this.stats.queued}</span>
                    <span class="stat-label">Queued</span>
                </div>
                <div class="stat">
                    <div class="stat-dot done"></div>
                    <span class="stat-value">${this.stats.done}</span>
                    <span class="stat-label">Done</span>
                </div>
                ${this.stats.blocked > 0 ? html`
                    <div class="stat">
                        <div class="stat-dot blocked"></div>
                        <span class="stat-value">${this.stats.blocked}</span>
                        <span class="stat-label">Blocked</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'mission-status': MissionStatus;
    }
}
