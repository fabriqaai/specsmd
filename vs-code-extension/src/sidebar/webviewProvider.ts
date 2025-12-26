/**
 * WebviewViewProvider implementation for the SpecsMD sidebar.
 * Provides a tabbed interface with Bolts, Specs, and Overview views.
 */

import * as vscode from 'vscode';
import { MemoryBankModel, Bolt, ArtifactStatus } from '../parser/types';
import { scanMemoryBank } from '../parser/artifactParser';
import { computeBoltDependencies, getUpNextBolts } from '../parser/dependencyComputation';
import { buildActivityFeed, formatRelativeTime } from '../parser/activityFeed';
import { getWebviewContent } from './webviewContent';
import {
    WebviewData,
    TabId,
    DEFAULT_TAB,
    TAB_STATE_KEY,
    FOCUS_EXPANDED_KEY,
    ACTIVITY_FILTER_KEY,
    ACTIVITY_HEIGHT_KEY,
    DEFAULT_ACTIVITY_FILTER,
    DEFAULT_ACTIVITY_HEIGHT,
    MIN_ACTIVITY_HEIGHT,
    MAX_ACTIVITY_HEIGHT,
    WebviewToExtensionMessage,
    ActiveBoltData,
    QueuedBoltData,
    ActivityEventData,
    ActivityFilter,
    IntentData,
    UnitData,
    StoryData
} from './webviewMessaging';

/**
 * WebviewViewProvider for the SpecsMD sidebar.
 */
export class SpecsmdWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'specsmdExplorer';

    private _view?: vscode.WebviewView;
    private _model: MemoryBankModel | null = null;
    private _activeTab: TabId = DEFAULT_TAB;
    private _focusCardExpanded: boolean = false;
    private _activityFilter: ActivityFilter = DEFAULT_ACTIVITY_FILTER;
    private _activityHeight: number = DEFAULT_ACTIVITY_HEIGHT;
    private _workspacePath: string | undefined;
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext, workspacePath?: string) {
        this._context = context;
        this._workspacePath = workspacePath;

        // Restore saved tab state
        const savedTab = context.workspaceState.get<TabId>(TAB_STATE_KEY);
        if (savedTab && ['bolts', 'specs', 'overview'].includes(savedTab)) {
            this._activeTab = savedTab;
        }

        // Restore saved focus card state
        const savedFocusExpanded = context.workspaceState.get<boolean>(FOCUS_EXPANDED_KEY);
        if (savedFocusExpanded !== undefined) {
            this._focusCardExpanded = savedFocusExpanded;
        }

        // Restore saved activity filter
        const savedActivityFilter = context.workspaceState.get<ActivityFilter>(ACTIVITY_FILTER_KEY);
        if (savedActivityFilter && ['all', 'stages', 'bolts'].includes(savedActivityFilter)) {
            this._activityFilter = savedActivityFilter;
        }

        // Restore saved activity height
        const savedActivityHeight = context.workspaceState.get<number>(ACTIVITY_HEIGHT_KEY);
        if (savedActivityHeight !== undefined) {
            this._activityHeight = Math.max(MIN_ACTIVITY_HEIGHT, Math.min(MAX_ACTIVITY_HEIGHT, savedActivityHeight));
        }
    }

    /**
     * Called when the webview view is resolved.
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        // Configure webview options
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: []
        };

        // Set up message handling
        webviewView.webview.onDidReceiveMessage(
            message => this._handleMessage(message),
            undefined,
            this._context.subscriptions
        );

        // Handle visibility changes
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateWebview();
            }
        });

        // Initial render
        this._updateWebview();
    }

    /**
     * Refreshes the view by rescanning the memory-bank.
     */
    public async refresh(): Promise<void> {
        const workspacePath = this._getWorkspacePath();
        if (workspacePath) {
            this._model = await scanMemoryBank(workspacePath);
            // Compute dependencies after scanning
            if (this._model && this._model.bolts.length > 0) {
                this._model.bolts = computeBoltDependencies(this._model.bolts);
            }
        } else {
            this._model = null;
        }
        this._updateWebview();
    }

    /**
     * Gets the current model (for testing).
     */
    public getModel(): MemoryBankModel | null {
        return this._model;
    }

    /**
     * Sets the model directly (for testing).
     */
    public setModel(model: MemoryBankModel): void {
        this._model = model;
        // Compute dependencies
        if (this._model && this._model.bolts.length > 0) {
            this._model.bolts = computeBoltDependencies(this._model.bolts);
        }
        this._updateWebview();
    }

    /**
     * Gets the active tab.
     */
    public getActiveTab(): TabId {
        return this._activeTab;
    }

    /**
     * Sets the active tab and updates the view.
     */
    public setActiveTab(tab: TabId): void {
        this._activeTab = tab;
        this._context.workspaceState.update(TAB_STATE_KEY, tab);
        this._updateWebview();
    }

    /**
     * Gets the workspace path.
     */
    private _getWorkspacePath(): string | undefined {
        if (this._workspacePath) {
            return this._workspacePath;
        }
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }

    /**
     * Updates the webview content.
     */
    private _updateWebview(): void {
        if (!this._view) {
            return;
        }

        const data = this._buildWebviewData();
        this._view.webview.html = getWebviewContent(
            this._view.webview,
            data,
            this._activeTab
        );
    }

    /**
     * Builds the data structure for the webview.
     */
    private _buildWebviewData(): WebviewData {
        if (!this._model || !this._model.isProject) {
            return {
                currentIntent: null,
                stats: { active: 0, queued: 0, done: 0, blocked: 0 },
                activeBolt: null,
                upNextQueue: [],
                activityEvents: [],
                intents: [],
                standards: [],
                focusCardExpanded: this._focusCardExpanded,
                activityFilter: this._activityFilter,
                activityHeight: this._activityHeight
            };
        }

        // Get current intent (first intent for now)
        const currentIntent = this._model.intents.length > 0
            ? { name: this._model.intents[0].name, number: this._model.intents[0].number }
            : null;

        // Calculate stats
        const stats = this._calculateStats(this._model.bolts);

        // Get active bolt
        const activeBolt = this._getActiveBolt(this._model.bolts);

        // Get up next queue
        const upNextQueue = this._getUpNextQueue(this._model.bolts);

        // Build activity events
        const activityEvents = this._buildActivityEvents(this._model.bolts);

        // Build intents data for specs view
        const intents = this._buildIntentsData();

        // Build standards data
        const standards = this._model.standards.map(s => ({
            name: s.name,
            path: s.path
        }));

        return {
            currentIntent,
            stats,
            activeBolt,
            upNextQueue,
            activityEvents,
            intents,
            standards,
            focusCardExpanded: this._focusCardExpanded,
            activityFilter: this._activityFilter,
            activityHeight: this._activityHeight
        };
    }

    /**
     * Calculates bolt statistics.
     */
    private _calculateStats(bolts: Bolt[]): { active: number; queued: number; done: number; blocked: number } {
        return {
            active: bolts.filter(b => b.status === ArtifactStatus.InProgress).length,
            queued: bolts.filter(b => b.status === ArtifactStatus.Draft).length,
            done: bolts.filter(b => b.status === ArtifactStatus.Complete).length,
            blocked: bolts.filter(b => b.status === ArtifactStatus.Blocked).length
        };
    }

    /**
     * Gets the active bolt data.
     */
    private _getActiveBolt(bolts: Bolt[]): ActiveBoltData | null {
        const active = bolts.find(b => b.status === ArtifactStatus.InProgress);
        if (!active) {
            return null;
        }

        const stagesComplete = active.stages.filter(s => s.status === ArtifactStatus.Complete).length;

        return {
            id: active.id,
            name: active.id,
            type: this._formatBoltType(active.type),
            currentStage: active.currentStage,
            stagesComplete,
            stagesTotal: active.stages.length,
            storiesComplete: 0, // Would need story status tracking
            storiesTotal: active.stories.length,
            stages: active.stages.map(s => ({
                name: s.name,
                status: this._mapStatus(s.status)
            })),
            stories: active.stories.map(id => ({
                id,
                name: id,
                status: 'pending' as const // Would need story status lookup
            }))
        };
    }

    /**
     * Gets the up next queue.
     */
    private _getUpNextQueue(bolts: Bolt[]): QueuedBoltData[] {
        const upNext = getUpNextBolts(bolts);
        return upNext.slice(0, 5).map(bolt => ({
            id: bolt.id,
            name: bolt.id,
            type: this._formatBoltType(bolt.type),
            storiesCount: bolt.stories.length,
            isBlocked: bolt.isBlocked,
            blockedBy: bolt.blockedBy,
            unblocksCount: bolt.unblocksCount,
            stages: bolt.stages.map(s => ({
                name: s.name,
                status: this._mapStatus(s.status)
            }))
        }));
    }

    /**
     * Builds activity events.
     */
    private _buildActivityEvents(bolts: Bolt[]): ActivityEventData[] {
        const events = buildActivityFeed(bolts);
        const now = new Date();

        return events.slice(0, 10).map(event => ({
            id: event.id,
            type: event.type,
            text: event.text,
            target: event.targetName,
            tag: event.tag,
            relativeTime: formatRelativeTime(event.timestamp, now)
        }));
    }

    /**
     * Builds intents data for specs view.
     */
    private _buildIntentsData(): IntentData[] {
        if (!this._model) {
            return [];
        }

        return this._model.intents.map(intent => {
            const units: UnitData[] = intent.units.map(unit => {
                const stories: StoryData[] = unit.stories.map(story => ({
                    id: story.id,
                    title: story.title,
                    path: story.path,
                    status: this._mapStatus(story.status)
                }));

                const storiesComplete = stories.filter(s => s.status === 'complete').length;

                return {
                    name: unit.name,
                    path: unit.path,
                    status: this._mapStatus(unit.status),
                    storiesComplete,
                    storiesTotal: stories.length,
                    stories
                };
            });

            const storiesComplete = units.reduce((sum, u) => sum + u.storiesComplete, 0);
            const storiesTotal = units.reduce((sum, u) => sum + u.storiesTotal, 0);

            return {
                name: intent.name,
                number: intent.number,
                path: intent.path,
                storiesComplete,
                storiesTotal,
                units
            };
        });
    }

    /**
     * Maps ArtifactStatus to webview status.
     */
    private _mapStatus(status: ArtifactStatus): 'complete' | 'active' | 'pending' {
        switch (status) {
            case ArtifactStatus.Complete:
                return 'complete';
            case ArtifactStatus.InProgress:
                return 'active';
            default:
                return 'pending';
        }
    }

    /**
     * Formats bolt type for display.
     */
    private _formatBoltType(type: string): string {
        switch (type) {
            case 'ddd-construction-bolt':
                return 'DDD';
            case 'simple-construction-bolt':
                return 'Simple';
            case 'spike-bolt':
                return 'Spike';
            default:
                return type;
        }
    }

    /**
     * Handles messages from the webview.
     */
    private async _handleMessage(message: WebviewToExtensionMessage): Promise<void> {
        switch (message.type) {
            case 'ready':
                // Webview is ready, trigger initial data load
                await this.refresh();
                break;

            case 'tabChange':
                this.setActiveTab(message.tab);
                break;

            case 'refresh':
                await this.refresh();
                break;

            case 'openArtifact':
                await this._openArtifact(message.kind, message.path);
                break;

            case 'toggleFocus':
                this._focusCardExpanded = message.expanded;
                this._context.workspaceState.update(FOCUS_EXPANDED_KEY, message.expanded);
                // No need to re-render, state is tracked client-side
                break;

            case 'activityFilter':
                this._activityFilter = message.filter;
                this._context.workspaceState.update(ACTIVITY_FILTER_KEY, message.filter);
                // No need to re-render, filtering is done client-side
                break;

            case 'activityResize': {
                const height = Math.max(MIN_ACTIVITY_HEIGHT, Math.min(MAX_ACTIVITY_HEIGHT, message.height));
                this._activityHeight = height;
                this._context.workspaceState.update(ACTIVITY_HEIGHT_KEY, height);
                // No need to re-render, resize is done client-side
                break;
            }

            case 'startBolt':
                vscode.window.showInformationMessage(`Starting bolt: ${message.boltId}`);
                break;

            case 'openExternal':
                if (message.url) {
                    vscode.env.openExternal(vscode.Uri.parse(message.url));
                }
                break;
        }
    }

    /**
     * Opens an artifact file.
     */
    private async _openArtifact(kind: string, path: string): Promise<void> {
        try {
            const uri = vscode.Uri.file(path);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open ${kind}: ${path}`);
        }
    }

    /**
     * Disposes resources.
     */
    public dispose(): void {
        // Cleanup if needed
    }
}

/**
 * Creates and registers a SpecsmdWebviewProvider.
 */
export function createWebviewProvider(
    context: vscode.ExtensionContext,
    workspacePath?: string
): SpecsmdWebviewProvider {
    const provider = new SpecsmdWebviewProvider(context, workspacePath);

    // Register the webview view provider
    const registration = vscode.window.registerWebviewViewProvider(
        SpecsmdWebviewProvider.viewType,
        provider,
        {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }
    );

    context.subscriptions.push(registration);

    return provider;
}
