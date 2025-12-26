/**
 * StoriesList - Story checkboxes display.
 */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseElement } from '../shared/base-element.js';

/**
 * Story data.
 */
export interface StoryData {
    id: string;
    name: string;
    status: 'complete' | 'active' | 'pending';
}

/**
 * Stories list component.
 *
 * @example
 * ```html
 * <stories-list .stories=${stories}></stories-list>
 * ```
 */
@customElement('stories-list')
export class StoriesList extends BaseElement {
    /**
     * Array of stories.
     */
    @property({ type: Array })
    stories: StoryData[] = [];

    /**
     * Number of completed stories.
     */
    @property({ type: Number })
    storiesComplete = 0;

    static styles = [
        ...BaseElement.baseStyles,
        css`
            :host {
                display: block;
            }

            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                font-size: 11px;
                font-weight: 600;
                color: var(--foreground);
            }

            .count {
                font-weight: normal;
                color: var(--description-foreground);
            }

            .list {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .story {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 4px 0;
            }

            .story.completed {
                opacity: 0.7;
            }

            .checkbox {
                width: 14px;
                height: 14px;
                border-radius: 3px;
                border: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                flex-shrink: 0;
                background: var(--editor-background);
            }

            .checkbox.checked {
                background: var(--status-complete);
                border-color: var(--status-complete);
                color: white;
            }

            .name {
                font-size: 11px;
                color: var(--foreground);
            }

            .story.completed .name {
                text-decoration: line-through;
                color: var(--description-foreground);
            }
        `
    ];

    render() {
        if (this.stories.length === 0) {
            return html``;
        }

        return html`
            <div class="header">
                <span>Stories</span>
                <span class="count">${this.storiesComplete}/${this.stories.length}</span>
            </div>
            <div class="list">
                ${this.stories.map(story => html`
                    <div class="story ${story.status === 'complete' ? 'completed' : ''}">
                        <div class="checkbox ${story.status === 'complete' ? 'checked' : ''}">
                            ${story.status === 'complete' ? '✓' : ''}
                        </div>
                        <span class="name">${story.id}</span>
                    </div>
                `)}
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'stories-list': StoriesList;
    }
}
