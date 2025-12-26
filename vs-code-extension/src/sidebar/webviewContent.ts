/**
 * HTML/CSS/JS content generation for the webview.
 */

import * as vscode from 'vscode';
import { WebviewData, TabId, ActiveBoltData } from './webviewMessaging';

/**
 * Generates a nonce for CSP.
 */
export function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Generates the full HTML content for the webview.
 */
export function getWebviewContent(
    webview: vscode.Webview,
    data: WebviewData,
    activeTab: TabId
): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>SpecsMD</title>
    <style>${getStylesheet()}</style>
</head>
<body>
    <div class="sidebar">
        <div class="header">
            <span class="header-title">SpecsMD</span>
            <div class="header-actions">
                <button type="button" class="icon-btn" id="refreshBtn" title="Refresh">&#8635;</button>
            </div>
        </div>

        <div class="view-tabs">
            <button type="button" class="view-tab ${activeTab === 'bolts' ? 'active' : ''}" data-tab="bolts">
                &#9889; Bolts
            </button>
            <button type="button" class="view-tab ${activeTab === 'specs' ? 'active' : ''}" data-tab="specs">
                &#128203; Specs
            </button>
            <button type="button" class="view-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
                &#128202; Overview
            </button>
        </div>

        <div class="view-container ${activeTab === 'bolts' ? 'active' : ''}" id="bolts-view">
            ${getBoltsTabHtml(data)}
        </div>

        <div class="view-container ${activeTab === 'specs' ? 'active' : ''}" id="specs-view">
            ${getSpecsTabHtml(data)}
        </div>

        <div class="view-container ${activeTab === 'overview' ? 'active' : ''}" id="overview-view">
            ${getOverviewTabHtml(data)}
        </div>
    </div>

    <script nonce="${nonce}">${getScripts()}</script>
</body>
</html>`;
}

/**
 * Generates the CSS stylesheet.
 */
function getStylesheet(): string {
    return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: var(--vscode-font-family);
        background: var(--vscode-sideBar-background);
        color: var(--vscode-foreground);
        font-size: 13px;
        line-height: 1.4;
    }

    .sidebar {
        display: flex;
        flex-direction: column;
        height: 100vh;
    }

    .header {
        padding: 10px 12px;
        background: var(--vscode-sideBarSectionHeader-background);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-title {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .header-actions {
        display: flex;
        gap: 4px;
    }

    .icon-btn {
        background: none;
        border: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.15s;
    }

    .icon-btn:hover {
        background: var(--vscode-list-hoverBackground);
        color: var(--vscode-foreground);
    }

    /* Tabs */
    .view-tabs {
        display: flex;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .view-tab {
        flex: 1;
        padding: 10px;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
        background: none;
        border: none;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        border-bottom: 2px solid transparent;
        transition: all 0.15s;
    }

    .view-tab:hover {
        color: var(--vscode-foreground);
        background: var(--vscode-list-hoverBackground);
    }

    .view-tab.active {
        color: var(--vscode-textLink-foreground);
        border-bottom-color: var(--vscode-textLink-foreground);
    }

    /* View containers */
    .view-container {
        display: none;
        flex: 1;
        overflow-y: auto;
        flex-direction: column;
    }

    .view-container.active {
        display: flex;
    }

    /* Mission Status (Current Intent) */
    .mission-status {
        padding: 16px;
        background: var(--vscode-editor-background);
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .mission-label {
        font-size: 9px;
        color: var(--vscode-textLink-foreground);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 4px;
    }

    .mission-title {
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 8px;
    }

    .mission-stats {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
    }

    .mission-stat {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .mission-stat-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .mission-stat-dot.active { background: var(--vscode-charts-orange); }
    .mission-stat-dot.queued { background: var(--vscode-descriptionForeground); }
    .mission-stat-dot.done { background: var(--vscode-charts-green); }
    .mission-stat-dot.blocked { background: var(--vscode-charts-red); }

    .mission-stat-value {
        font-size: 12px;
        font-weight: 600;
    }

    .mission-stat-label {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
    }

    /* Section styling */
    .section {
        padding: 12px;
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .section-label {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .section-label-icon {
        font-size: 12px;
    }

    /* Focus Card */
    .focus-card {
        background: var(--vscode-editor-background);
        border: 2px solid var(--vscode-textLink-foreground);
        border-radius: 8px;
        overflow: hidden;
    }

    .focus-card-header {
        padding: 12px;
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 10%, transparent);
        cursor: pointer;
        transition: background 0.15s;
    }

    .focus-card-header:hover {
        background: color-mix(in srgb, var(--vscode-textLink-foreground) 15%, transparent);
    }

    .focus-card-title {
        font-size: 13px;
        font-weight: 600;
    }

    .focus-card-subtitle {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
    }

    .focus-card-badge {
        display: inline-block;
        font-size: 9px;
        padding: 3px 8px;
        border-radius: 12px;
        background: var(--vscode-textLink-foreground);
        color: var(--vscode-editor-background);
        margin-top: 8px;
    }

    .focus-card-expand {
        float: right;
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        transition: transform 0.2s;
    }

    .focus-card.expanded .focus-card-expand {
        transform: rotate(180deg);
    }

    .focus-card-body {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        padding: 0 12px;
    }

    .focus-card.expanded .focus-card-body {
        max-height: 500px;
        padding: 12px;
        border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    /* Progress Ring */
    .focus-progress {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
    }

    .progress-ring {
        width: 48px;
        height: 48px;
        transform: rotate(-90deg);
    }

    .progress-ring-bg {
        fill: none;
        stroke: var(--vscode-input-background);
        stroke-width: 4;
    }

    .progress-ring-fill {
        fill: none;
        stroke: var(--vscode-textLink-foreground);
        stroke-width: 4;
        stroke-linecap: round;
        transition: stroke-dasharray 0.5s ease;
    }

    .progress-text {
        text-align: center;
    }

    .progress-percent {
        font-size: 18px;
        font-weight: 700;
        color: var(--vscode-textLink-foreground);
    }

    .progress-label {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
    }

    /* Stage Pipeline */
    .stage-pipeline {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
    }

    .stage-pip {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }

    .stage-pip-indicator {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
    }

    .stage-pip-indicator.complete {
        background: var(--vscode-charts-green);
        color: white;
    }

    .stage-pip-indicator.active {
        background: var(--vscode-charts-orange);
        color: white;
        animation: pulse 1.5s infinite;
    }

    .stage-pip-indicator.pending {
        background: var(--vscode-input-background);
        color: var(--vscode-descriptionForeground);
        border: 1px dashed var(--vscode-descriptionForeground);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }

    .stage-pip-label {
        font-size: 8px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
    }

    /* Stories Checklist */
    .focus-stories {
        margin-bottom: 12px;
    }

    .focus-stories-title {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
        margin-bottom: 6px;
    }

    .focus-story-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
    }

    .focus-story-checkbox {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
    }

    .focus-story-checkbox.complete {
        background: var(--vscode-charts-green);
        color: white;
    }

    .focus-story-checkbox.pending {
        border: 1px solid var(--vscode-descriptionForeground);
    }

    .focus-story-name {
        font-size: 11px;
    }

    .focus-story-name.complete {
        color: var(--vscode-descriptionForeground);
        text-decoration: line-through;
    }

    /* Focus Actions */
    .focus-actions {
        display: flex;
        gap: 8px;
    }

    .focus-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
    }

    .focus-btn.primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
    }

    .focus-btn.primary:hover {
        background: var(--vscode-button-hoverBackground);
    }

    .focus-btn.secondary {
        background: var(--vscode-input-background);
        color: var(--vscode-foreground);
    }

    .focus-btn.secondary:hover {
        background: var(--vscode-list-hoverBackground);
    }

    /* Queue Lock Icon */
    .queue-lock {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--vscode-charts-red);
    }

    /* Queue Stage Indicators */
    .queue-stages {
        display: flex;
        gap: 2px;
        margin-top: 4px;
    }

    .queue-stage {
        width: 8px;
        height: 8px;
        border-radius: 2px;
    }

    .queue-stage.complete { background: var(--vscode-charts-green); }
    .queue-stage.active { background: var(--vscode-charts-orange); }
    .queue-stage.pending { background: var(--vscode-input-background); }

    /* Activity Filters */
    .activity-filters {
        display: flex;
        gap: 4px;
    }

    .activity-filter-btn {
        padding: 3px 8px;
        font-size: 9px;
        border: none;
        border-radius: 10px;
        background: var(--vscode-input-background);
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
        transition: all 0.15s;
    }

    .activity-filter-btn:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .activity-filter-btn.active {
        background: var(--vscode-textLink-foreground);
        color: var(--vscode-editor-background);
    }

    /* Resize Handle */
    .activity-resize-handle {
        height: 6px;
        cursor: ns-resize;
        background: var(--vscode-sideBarSectionHeader-border);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
    }

    .activity-resize-handle:hover {
        background: var(--vscode-textLink-foreground);
    }

    .activity-resize-handle::after {
        content: '';
        width: 30px;
        height: 2px;
        background: var(--vscode-descriptionForeground);
        border-radius: 1px;
    }

    .activity-resize-handle:hover::after {
        background: var(--vscode-editor-background);
    }

    /* Empty state */
    .empty-state {
        padding: 20px;
        text-align: center;
        color: var(--vscode-descriptionForeground);
    }

    .empty-state-icon {
        font-size: 24px;
        margin-bottom: 8px;
    }

    .empty-state-text {
        font-size: 11px;
    }

    /* Queue section */
    .queue-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .queue-title {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
    }

    .queue-count {
        font-size: 9px;
        padding: 2px 8px;
        border-radius: 10px;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
    }

    .queue-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .queue-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        background: var(--vscode-editor-background);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
        border-left: 3px solid transparent;
    }

    .queue-item:hover {
        background: var(--vscode-list-hoverBackground);
        border-left-color: var(--vscode-textLink-foreground);
    }

    .queue-item.blocked {
        opacity: 0.7;
        border-left-color: var(--vscode-charts-red);
    }

    .queue-priority {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 600;
        background: var(--vscode-input-background);
        color: var(--vscode-descriptionForeground);
    }

    .queue-info {
        flex: 1;
        min-width: 0;
    }

    .queue-name {
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .queue-meta {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
    }

    .queue-blocked-info {
        font-size: 9px;
        color: var(--vscode-charts-red);
        margin-top: 2px;
    }

    /* Activity section */
    .activity-section {
        padding: 12px;
        background: var(--vscode-editor-background);
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 120px;
    }

    .activity-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .activity-title {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .activity-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        overflow-y: auto;
    }

    .activity-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 8px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
    }

    .activity-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .activity-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        flex-shrink: 0;
    }

    .activity-icon.stage-complete {
        background: color-mix(in srgb, var(--vscode-charts-green) 20%, transparent);
        color: var(--vscode-charts-green);
    }

    .activity-icon.bolt-complete {
        background: color-mix(in srgb, var(--vscode-charts-green) 30%, transparent);
        color: var(--vscode-charts-green);
    }

    .activity-icon.bolt-start {
        background: color-mix(in srgb, var(--vscode-charts-blue) 20%, transparent);
        color: var(--vscode-charts-blue);
    }

    .activity-icon.bolt-created {
        background: color-mix(in srgb, var(--vscode-charts-purple) 20%, transparent);
        color: var(--vscode-charts-purple);
    }

    .activity-content {
        flex: 1;
        min-width: 0;
    }

    .activity-text {
        font-size: 11px;
        line-height: 1.4;
    }

    .activity-text strong {
        color: var(--vscode-textLink-foreground);
    }

    .activity-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 3px;
    }

    .activity-target {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .activity-tag {
        font-size: 8px;
        padding: 2px 6px;
        border-radius: 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-descriptionForeground);
        text-transform: uppercase;
    }

    .activity-time {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* Specs view */
    .specs-content {
        flex: 1;
        overflow-y: auto;
    }

    .intent-item {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .intent-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.15s;
    }

    .intent-header:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .intent-expand {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        transition: transform 0.2s;
    }

    .intent-item.collapsed .intent-expand {
        transform: rotate(-90deg);
    }

    .intent-icon {
        font-size: 14px;
    }

    .intent-info {
        flex: 1;
    }

    .intent-name {
        font-size: 12px;
        font-weight: 500;
    }

    .intent-meta {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
    }

    .intent-progress {
        font-size: 10px;
        color: var(--vscode-charts-green);
        font-weight: 600;
    }

    .intent-content {
        max-height: 2000px;
        overflow: hidden;
        transition: max-height 0.3s ease;
        background: var(--vscode-editor-background);
    }

    .intent-item.collapsed .intent-content {
        max-height: 0;
    }

    .unit-item {
        border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
    }

    .unit-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px 8px 28px;
        cursor: pointer;
        transition: background 0.15s;
    }

    .unit-header:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .unit-expand {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        transition: transform 0.2s;
    }

    .unit-item.collapsed .unit-expand {
        transform: rotate(-90deg);
    }

    .unit-status {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        color: white;
    }

    .unit-status.complete { background: var(--vscode-charts-green); }
    .unit-status.active { background: var(--vscode-charts-orange); }
    .unit-status.pending {
        background: var(--vscode-input-background);
        border: 1px dashed var(--vscode-descriptionForeground);
        color: var(--vscode-descriptionForeground);
    }

    .unit-name {
        flex: 1;
        font-size: 11px;
    }

    .unit-progress {
        font-size: 9px;
        color: var(--vscode-descriptionForeground);
    }

    .unit-content {
        max-height: 1000px;
        overflow: hidden;
        transition: max-height 0.3s ease;
    }

    .unit-item.collapsed .unit-content {
        max-height: 0;
    }

    .story-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px 6px 52px;
        cursor: pointer;
        transition: background 0.15s;
    }

    .story-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .story-status {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--vscode-descriptionForeground);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
    }

    .story-status.complete {
        background: var(--vscode-charts-green);
        border-color: var(--vscode-charts-green);
        color: white;
    }

    .story-status.active {
        background: var(--vscode-charts-orange);
        border-color: var(--vscode-charts-orange);
        color: white;
    }

    .story-name {
        flex: 1;
        font-size: 11px;
    }

    .story-name.complete {
        color: var(--vscode-descriptionForeground);
    }

    /* Overview view */
    .overview-content {
        padding: 16px;
    }

    .overview-section {
        margin-bottom: 20px;
    }

    .overview-section-title {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 10px;
    }

    .overview-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .overview-metric-card {
        background: var(--vscode-editor-background);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
    }

    .overview-metric-value {
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 4px;
    }

    .overview-metric-value.highlight { color: var(--vscode-textLink-foreground); }
    .overview-metric-value.success { color: var(--vscode-charts-green); }

    .overview-metric-label {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
    }

    .overview-progress-bar {
        height: 8px;
        background: var(--vscode-input-background);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 20px;
    }

    .overview-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--vscode-charts-green), var(--vscode-textLink-foreground));
        border-radius: 4px;
        transition: width 0.5s ease;
    }

    .overview-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .overview-list-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: var(--vscode-editor-background);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .overview-list-item:hover {
        background: var(--vscode-list-hoverBackground);
    }

    .overview-list-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
    }

    .overview-list-icon.intent {
        background: color-mix(in srgb, var(--vscode-charts-purple) 20%, transparent);
        color: var(--vscode-charts-purple);
    }

    .overview-list-info {
        flex: 1;
    }

    .overview-list-name {
        font-size: 12px;
        font-weight: 500;
    }

    .overview-list-meta {
        font-size: 10px;
        color: var(--vscode-descriptionForeground);
        margin-top: 2px;
    }

    .overview-list-progress {
        font-size: 11px;
        font-weight: 600;
        color: var(--vscode-charts-green);
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 8px;
    }

    ::-webkit-scrollbar-track {
        background: transparent;
    }

    ::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
    }
    `;
}

/**
 * Generates HTML for the Bolts tab.
 */
function getBoltsTabHtml(data: WebviewData): string {
    const intentHeader = data.currentIntent
        ? `<div class="mission-status">
            <div class="mission-label">Current Intent</div>
            <div class="mission-title">${escapeHtml(data.currentIntent.number)}-${escapeHtml(data.currentIntent.name)}</div>
            <div class="mission-stats">
                <div class="mission-stat">
                    <div class="mission-stat-dot active"></div>
                    <span class="mission-stat-value">${data.stats.active}</span>
                    <span class="mission-stat-label">Active</span>
                </div>
                <div class="mission-stat">
                    <div class="mission-stat-dot queued"></div>
                    <span class="mission-stat-value">${data.stats.queued}</span>
                    <span class="mission-stat-label">Queued</span>
                </div>
                <div class="mission-stat">
                    <div class="mission-stat-dot done"></div>
                    <span class="mission-stat-value">${data.stats.done}</span>
                    <span class="mission-stat-label">Done</span>
                </div>
                ${data.stats.blocked > 0 ? `
                <div class="mission-stat">
                    <div class="mission-stat-dot blocked"></div>
                    <span class="mission-stat-value">${data.stats.blocked}</span>
                    <span class="mission-stat-label">Blocked</span>
                </div>
                ` : ''}
            </div>
        </div>`
        : `<div class="mission-status">
            <div class="mission-label">Current Intent</div>
            <div class="mission-title">No intents found</div>
        </div>`;

    const focusSection = data.activeBolt
        ? `<div class="section">
            <div class="section-label">
                <span class="section-label-icon">&#127919;</span>
                Current Focus
            </div>
            <div class="focus-card ${data.focusCardExpanded ? 'expanded' : ''}" data-bolt-id="${escapeHtml(data.activeBolt.id)}">
                <div class="focus-card-header">
                    <span class="focus-card-expand">&#9660;</span>
                    <div class="focus-card-title">${escapeHtml(data.activeBolt.name)}</div>
                    <div class="focus-card-subtitle">${escapeHtml(data.activeBolt.type)} Bolt | ${data.activeBolt.currentStage ? escapeHtml(data.activeBolt.currentStage) : 'Not started'} Stage</div>
                    <div class="focus-card-badge">In Progress</div>
                </div>
                <div class="focus-card-body">
                    ${getFocusCardBody(data.activeBolt)}
                </div>
            </div>
        </div>`
        : `<div class="section">
            <div class="section-label">
                <span class="section-label-icon">&#127919;</span>
                Current Focus
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">&#128640;</div>
                <div class="empty-state-text">No active bolt</div>
            </div>
        </div>`;

    const queueSection = `<div class="section">
        <div class="queue-header">
            <span class="queue-title">Up Next</span>
            <span class="queue-count">${data.upNextQueue.length} bolts</span>
        </div>
        ${data.upNextQueue.length > 0
            ? `<div class="queue-list">
                ${data.upNextQueue.slice(0, 5).map((bolt, idx) => `
                    <div class="queue-item ${bolt.isBlocked ? 'blocked' : ''}" data-bolt-id="${escapeHtml(bolt.id)}">
                        ${bolt.isBlocked
                            ? `<div class="queue-lock">&#128274;</div>`
                            : `<div class="queue-priority">${idx + 1}</div>`
                        }
                        <div class="queue-info">
                            <div class="queue-name">${escapeHtml(bolt.name)}</div>
                            <div class="queue-meta">${escapeHtml(bolt.type)} | ${bolt.storiesCount} stories${bolt.unblocksCount > 0 ? ` | Enables ${bolt.unblocksCount}` : ''}</div>
                            ${bolt.isBlocked ? `<div class="queue-blocked-info">Waiting: ${bolt.blockedBy.map(escapeHtml).join(', ')}</div>` : ''}
                            <div class="queue-stages">
                                ${bolt.stages.map(stage => `<div class="queue-stage ${stage.status}"></div>`).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`
            : `<div class="empty-state">
                <div class="empty-state-text">Queue empty</div>
            </div>`
        }
    </div>`;

    const activitySection = `<div class="activity-resize-handle" id="activityResizeHandle"></div>
        <div class="activity-section" style="height: ${data.activityHeight}px;">
        <div class="activity-header">
            <div class="activity-title">
                <span>&#128340;</span>
                Recent Activity
            </div>
            <div class="activity-filters">
                <button class="activity-filter-btn ${data.activityFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
                <button class="activity-filter-btn ${data.activityFilter === 'stages' ? 'active' : ''}" data-filter="stages">Stages</button>
                <button class="activity-filter-btn ${data.activityFilter === 'bolts' ? 'active' : ''}" data-filter="bolts">Bolts</button>
            </div>
        </div>
        ${data.activityEvents.length > 0
            ? `<div class="activity-list">
                ${data.activityEvents.slice(0, 10).map(event => `
                    <div class="activity-item" data-target="${escapeHtml(event.target)}" data-tag="${event.tag}">
                        <div class="activity-icon ${event.type}">${getActivityIcon(event.type)}</div>
                        <div class="activity-content">
                            <div class="activity-text">${event.text}</div>
                            <div class="activity-meta">
                                <span class="activity-target">${escapeHtml(event.target)}</span>
                                <span class="activity-tag">${event.tag}</span>
                            </div>
                        </div>
                        <div class="activity-time">${escapeHtml(event.relativeTime)}</div>
                    </div>
                `).join('')}
            </div>`
            : `<div class="empty-state">
                <div class="empty-state-text">No recent activity</div>
            </div>`
        }
    </div>`;

    return intentHeader + focusSection + queueSection + activitySection;
}

/**
 * Generates HTML for the Specs tab.
 */
function getSpecsTabHtml(data: WebviewData): string {
    if (data.intents.length === 0) {
        return `<div class="empty-state">
            <div class="empty-state-icon">&#128203;</div>
            <div class="empty-state-text">No intents found</div>
        </div>`;
    }

    return `<div class="specs-content">
        ${data.intents.map(intent => {
            const progress = intent.storiesTotal > 0
                ? Math.round((intent.storiesComplete / intent.storiesTotal) * 100)
                : 0;

            return `<div class="intent-item">
                <div class="intent-header" data-intent="${escapeHtml(intent.number)}">
                    <span class="intent-expand">&#9660;</span>
                    <span class="intent-icon">&#128203;</span>
                    <div class="intent-info">
                        <div class="intent-name">${escapeHtml(intent.number)}-${escapeHtml(intent.name)}</div>
                        <div class="intent-meta">${intent.units.length} units | ${intent.storiesTotal} stories</div>
                    </div>
                    <div class="intent-progress">${progress}%</div>
                </div>
                <div class="intent-content">
                    ${intent.units.map(unit => `
                        <div class="unit-item">
                            <div class="unit-header" data-unit="${escapeHtml(unit.name)}">
                                <span class="unit-expand">&#9660;</span>
                                <div class="unit-status ${unit.status}">
                                    ${unit.status === 'complete' ? '&#10003;' : ''}
                                </div>
                                <span class="unit-name">${escapeHtml(unit.name)}</span>
                                <span class="unit-progress">${unit.storiesComplete}/${unit.storiesTotal}</span>
                            </div>
                            <div class="unit-content">
                                ${unit.stories.map(story => `
                                    <div class="story-item" data-path="${escapeHtml(story.path)}">
                                        <div class="story-status ${story.status}">
                                            ${story.status === 'complete' ? '&#10003;' : story.status === 'active' ? '&#9679;' : ''}
                                        </div>
                                        <span class="story-name ${story.status === 'complete' ? 'complete' : ''}">${escapeHtml(story.id)}-${escapeHtml(story.title)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

/**
 * Generates HTML for the Overview tab.
 */
function getOverviewTabHtml(data: WebviewData): string {
    const totalStories = data.intents.reduce((sum, i) => sum + i.storiesTotal, 0);
    const completedStories = data.intents.reduce((sum, i) => sum + i.storiesComplete, 0);
    const progressPercent = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;
    const totalBolts = data.stats.active + data.stats.queued + data.stats.done + data.stats.blocked;

    return `<div class="overview-content">
        <div class="overview-section">
            <div class="overview-section-title">Overall Progress</div>
            <div class="overview-progress-bar">
                <div class="overview-progress-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="overview-metrics">
                <div class="overview-metric-card">
                    <div class="overview-metric-value highlight">${progressPercent}%</div>
                    <div class="overview-metric-label">Complete</div>
                </div>
                <div class="overview-metric-card">
                    <div class="overview-metric-value success">${completedStories}/${totalStories}</div>
                    <div class="overview-metric-label">Stories Done</div>
                </div>
                <div class="overview-metric-card">
                    <div class="overview-metric-value">${data.stats.done}/${totalBolts}</div>
                    <div class="overview-metric-label">Bolts Done</div>
                </div>
                <div class="overview-metric-card">
                    <div class="overview-metric-value">${data.intents.length}</div>
                    <div class="overview-metric-label">Intents</div>
                </div>
            </div>
        </div>

        <div class="overview-section">
            <div class="overview-section-title">Intents</div>
            <div class="overview-list">
                ${data.intents.map(intent => {
                    const progress = intent.storiesTotal > 0
                        ? Math.round((intent.storiesComplete / intent.storiesTotal) * 100)
                        : 0;
                    return `
                        <div class="overview-list-item" data-intent="${escapeHtml(intent.number)}">
                            <div class="overview-list-icon intent">&#128203;</div>
                            <div class="overview-list-info">
                                <div class="overview-list-name">${escapeHtml(intent.number)}-${escapeHtml(intent.name)}</div>
                                <div class="overview-list-meta">${intent.units.length} units | ${intent.storiesTotal} stories</div>
                            </div>
                            <div class="overview-list-progress">${progress}%</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <div class="overview-section">
            <div class="overview-section-title">Standards</div>
            <div class="overview-list">
                ${data.standards.length > 0
                    ? data.standards.map(standard => `
                        <div class="overview-list-item" data-path="${escapeHtml(standard.path)}">
                            <div class="overview-list-icon intent">&#128220;</div>
                            <div class="overview-list-info">
                                <div class="overview-list-name">${escapeHtml(standard.name)}</div>
                            </div>
                        </div>
                    `).join('')
                    : `<div class="empty-state"><div class="empty-state-text">No standards defined</div></div>`
                }
            </div>
        </div>

        <div class="overview-section">
            <div class="overview-section-title">Resources</div>
            <div class="overview-list">
                <div class="overview-list-item" id="specsWebsiteLink">
                    <div class="overview-list-icon intent">&#127760;</div>
                    <div class="overview-list-info">
                        <div class="overview-list-name">specs.md</div>
                        <div class="overview-list-meta">Visit our website</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

/**
 * Gets the activity icon for an event type.
 */
function getActivityIcon(type: string): string {
    switch (type) {
        case 'bolt-created': return '&#43;';
        case 'bolt-start': return '&#9654;';
        case 'stage-complete': return '&#10003;';
        case 'bolt-complete': return '&#10004;';
        default: return '&#8226;';
    }
}

/**
 * Generates the focus card body with progress ring, stage pipeline, and stories.
 */
function getFocusCardBody(bolt: ActiveBoltData): string {
    // Calculate progress percentage
    const totalItems = bolt.stagesTotal + bolt.storiesTotal;
    const completedItems = bolt.stagesComplete + bolt.storiesComplete;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // SVG progress ring calculation
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (progressPercent / 100) * circumference;

    // Stage pipeline with abbreviations
    const stageAbbreviations: Record<string, string> = {
        'model': 'M',
        'design': 'D',
        'architecture': 'A',
        'implement': 'I',
        'test': 'T',
        'plan': 'P'
    };

    const stagePipeline = bolt.stages.map(stage => {
        const abbrev = stageAbbreviations[stage.name.toLowerCase()] || stage.name.charAt(0).toUpperCase();
        return `<div class="stage-pip">
            <div class="stage-pip-indicator ${stage.status}">${abbrev}</div>
            <div class="stage-pip-label">${escapeHtml(stage.name)}</div>
        </div>`;
    }).join('');

    // Stories checklist
    const storiesChecklist = bolt.stories.map(story => `
        <div class="focus-story-item">
            <div class="focus-story-checkbox ${story.status}">
                ${story.status === 'complete' ? '&#10003;' : ''}
            </div>
            <span class="focus-story-name ${story.status === 'complete' ? 'complete' : ''}">${escapeHtml(story.id)}</span>
        </div>
    `).join('');

    return `
        <div class="focus-progress">
            <svg class="progress-ring" viewBox="0 0 48 48">
                <circle class="progress-ring-bg" cx="24" cy="24" r="${radius}"></circle>
                <circle class="progress-ring-fill" cx="24" cy="24" r="${radius}"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${dashOffset}"></circle>
            </svg>
            <div class="progress-text">
                <div class="progress-percent">${progressPercent}%</div>
                <div class="progress-label">Complete</div>
            </div>
        </div>
        <div class="stage-pipeline">
            ${stagePipeline}
        </div>
        ${bolt.stories.length > 0 ? `
            <div class="focus-stories">
                <div class="focus-stories-title">Stories (${bolt.storiesComplete}/${bolt.storiesTotal})</div>
                ${storiesChecklist}
            </div>
        ` : ''}
        <div class="focus-actions">
            <button class="focus-btn primary" id="continueBoltBtn">Continue</button>
            <button class="focus-btn secondary" id="filesBoltBtn">Files</button>
        </div>
    `;
}

/**
 * Generates the JavaScript for the webview.
 */
function getScripts(): string {
    return `
    const vscode = acquireVsCodeApi();

    // Notify extension that webview is ready
    vscode.postMessage({ type: 'ready' });

    // Tab switching
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            vscode.postMessage({ type: 'tabChange', tab: tabId });
        });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        vscode.postMessage({ type: 'refresh' });
    });

    // Focus card expand/collapse
    const focusCard = document.querySelector('.focus-card');
    if (focusCard) {
        const focusHeader = focusCard.querySelector('.focus-card-header');
        if (focusHeader) {
            focusHeader.addEventListener('click', () => {
                focusCard.classList.toggle('expanded');
                const expanded = focusCard.classList.contains('expanded');
                vscode.postMessage({ type: 'toggleFocus', expanded: expanded });
            });
        }

        // Continue button
        const continueBtn = document.getElementById('continueBoltBtn');
        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const boltId = focusCard.dataset.boltId;
                if (boltId) {
                    vscode.postMessage({ type: 'startBolt', boltId: boltId });
                }
            });
        }

        // Files button
        const filesBtn = document.getElementById('filesBoltBtn');
        if (filesBtn) {
            filesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Show files associated with bolt - placeholder for now
            });
        }
    }

    // Activity filter buttons
    document.querySelectorAll('.activity-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            // Update active state
            document.querySelectorAll('.activity-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter activity items
            document.querySelectorAll('.activity-item').forEach(item => {
                const tag = item.dataset.tag;
                if (filter === 'all') {
                    item.style.display = 'flex';
                } else if (filter === 'stages' && tag === 'stage') {
                    item.style.display = 'flex';
                } else if (filter === 'bolts' && tag === 'bolt') {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });

            // Persist filter
            vscode.postMessage({ type: 'activityFilter', filter: filter });
        });
    });

    // Activity resize handle
    const resizeHandle = document.getElementById('activityResizeHandle');
    const activitySection = document.querySelector('.activity-section');
    if (resizeHandle && activitySection) {
        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = activitySection.offsetHeight;
            document.body.style.cursor = 'ns-resize';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            // Moving up increases height, moving down decreases
            const deltaY = startY - e.clientY;
            let newHeight = startHeight + deltaY;

            // Clamp to min/max
            newHeight = Math.max(120, Math.min(500, newHeight));

            activitySection.style.height = newHeight + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';

                // Persist height
                const finalHeight = activitySection.offsetHeight;
                vscode.postMessage({ type: 'activityResize', height: finalHeight });
            }
        });
    }

    // Intent toggle in specs view
    document.querySelectorAll('.intent-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            item.classList.toggle('collapsed');
        });
    });

    // Unit toggle in specs view
    document.querySelectorAll('.unit-header').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = header.parentElement;
            item.classList.toggle('collapsed');
        });
    });

    // Story click in specs view
    document.querySelectorAll('.story-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = item.dataset.path;
            if (path) {
                vscode.postMessage({ type: 'openArtifact', kind: 'story', path: path });
            }
        });
    });

    // Overview list item clicks
    document.querySelectorAll('.overview-list-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            if (path) {
                vscode.postMessage({ type: 'openArtifact', kind: 'standard', path: path });
            } else if (item.dataset.intent) {
                vscode.postMessage({ type: 'tabChange', tab: 'specs' });
            }
        });
    });

    // Queue item clicks
    document.querySelectorAll('.queue-item').forEach(item => {
        item.addEventListener('click', () => {
            const boltId = item.dataset.boltId;
            if (boltId) {
                vscode.postMessage({ type: 'startBolt', boltId: boltId });
            }
        });
    });

    // Website link in Overview tab
    const specsWebsiteLink = document.getElementById('specsWebsiteLink');
    if (specsWebsiteLink) {
        specsWebsiteLink.addEventListener('click', () => {
            vscode.postMessage({ type: 'openExternal', url: 'https://specs.md' });
        });
    }

    // Handle messages from extension
    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
            case 'update':
                // Full page refresh will be handled by extension re-rendering
                break;
            case 'setTab':
                // Tab switch handled by extension re-rendering
                break;
        }
    });
    `;
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text: string): string {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
