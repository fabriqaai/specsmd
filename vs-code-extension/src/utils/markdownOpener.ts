/**
 * Utility for opening markdown files with the user's preferred editor.
 */

import * as vscode from 'vscode';

/**
 * Markdown editor option for the picker.
 */
export interface MarkdownEditorOption {
    id: string;
    label: string;
    description: string;
    detail?: string;
    /** The type of action to perform when this editor is selected */
    actionType: 'builtin' | 'customEditor' | 'command';
    /** For command action type, the command to execute */
    command?: string;
}

/**
 * Built-in markdown editor options.
 */
const BUILTIN_EDITORS: MarkdownEditorOption[] = [
    {
        id: 'default',
        label: 'Text Editor',
        description: 'VS Code default text editor',
        actionType: 'builtin'
    },
    {
        id: 'preview',
        label: 'Markdown Preview',
        description: 'VS Code built-in markdown preview',
        actionType: 'builtin'
    },
    {
        id: 'side-by-side',
        label: 'Side by Side',
        description: 'Text editor with preview panel',
        actionType: 'builtin'
    }
];

/**
 * Interface for custom editor contribution in extension package.json
 */
interface CustomEditorContribution {
    viewType: string;
    displayName: string;
    selector: Array<{
        filenamePattern: string;
    }>;
    priority?: string;
}

/**
 * Checks if a filename pattern matches markdown files.
 */
function matchesMarkdown(pattern: string): boolean {
    const lowerPattern = pattern.toLowerCase();
    return (
        lowerPattern === '*.md' ||
        lowerPattern === '*.markdown' ||
        lowerPattern === '**/*.md' ||
        lowerPattern === '**/*.markdown' ||
        lowerPattern.includes('.md') ||
        lowerPattern.includes('markdown')
    );
}

/**
 * Detects available markdown editors from installed extensions dynamically.
 * Scans all installed extensions for:
 * 1. Custom editors that handle markdown files
 * 2. Commands that suggest markdown preview functionality
 */
export function detectAvailableEditors(): MarkdownEditorOption[] {
    const available: MarkdownEditorOption[] = [...BUILTIN_EDITORS];
    const seenIds = new Set<string>(BUILTIN_EDITORS.map(e => e.id));

    // Scan all installed extensions
    for (const extension of vscode.extensions.all) {
        // Skip built-in extensions (they start with 'vscode.')
        if (extension.id.startsWith('vscode.')) {
            continue;
        }

        const packageJson = extension.packageJSON;
        if (!packageJson?.contributes) {
            continue;
        }

        // Check for custom editors that handle markdown
        const customEditors = packageJson.contributes.customEditors as CustomEditorContribution[] | undefined;
        if (customEditors && Array.isArray(customEditors)) {
            for (const editor of customEditors) {
                // Check if this editor handles markdown files
                const handlesMarkdown = editor.selector?.some(
                    sel => matchesMarkdown(sel.filenamePattern)
                );

                if (handlesMarkdown && !seenIds.has(editor.viewType)) {
                    seenIds.add(editor.viewType);
                    available.push({
                        id: editor.viewType,
                        label: editor.displayName || editor.viewType,
                        description: extension.id,
                        detail: 'Custom editor',
                        actionType: 'customEditor'
                    });
                }
            }
        }

        // Check for markdown preview commands contributed by extensions
        const commands = packageJson.contributes.commands as Array<{ command: string; title: string }> | undefined;
        if (commands && Array.isArray(commands)) {
            for (const cmd of commands) {
                const cmdLower = cmd.command.toLowerCase();
                const titleLower = cmd.title?.toLowerCase() || '';

                // Look for preview-related commands for markdown
                if (
                    (cmdLower.includes('markdown') && cmdLower.includes('preview')) ||
                    (titleLower.includes('markdown') && titleLower.includes('preview'))
                ) {
                    const editorId = `cmd:${cmd.command}`;
                    if (!seenIds.has(editorId)) {
                        seenIds.add(editorId);
                        available.push({
                            id: editorId,
                            label: cmd.title || cmd.command,
                            description: extension.id,
                            detail: 'Preview command',
                            actionType: 'command',
                            command: cmd.command
                        });
                    }
                }
            }
        }
    }

    return available;
}

/**
 * Gets the user's markdown editor preference from settings.
 */
export function getMarkdownEditorPreference(): string {
    const config = vscode.workspace.getConfiguration('specsmd');
    return config.get<string>('markdownEditor', 'default');
}

/**
 * Quick pick item with editor ID.
 */
interface EditorQuickPickItem extends vscode.QuickPickItem {
    id: string;
}

/**
 * Shows a quick pick to select a markdown editor and saves the preference.
 * @param savePreference Whether to save the selected preference (default: true)
 */
export async function showMarkdownEditorPicker(savePreference = true): Promise<string | undefined> {
    const editors = detectAvailableEditors();

    // Group editors: built-in first, then extensions
    const builtinItems: EditorQuickPickItem[] = [];
    const extensionItems: EditorQuickPickItem[] = [];

    for (const editor of editors) {
        const item: EditorQuickPickItem = {
            label: editor.label,
            description: editor.description,
            detail: editor.detail,
            id: editor.id
        };

        if (editor.actionType === 'builtin') {
            builtinItems.push(item);
        } else {
            extensionItems.push(item);
        }
    }

    // Add separators if there are extension editors
    const items: (EditorQuickPickItem | vscode.QuickPickItem)[] = [...builtinItems];
    if (extensionItems.length > 0) {
        items.push({
            label: 'Installed Extensions',
            kind: vscode.QuickPickItemKind.Separator
        } as vscode.QuickPickItem);
        items.push(...extensionItems);
    }

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select how to open markdown files',
        title: 'Markdown Editor Selection',
        matchOnDescription: true,
        matchOnDetail: true
    });

    if (selected && 'id' in selected) {
        // Save the preference if requested
        if (savePreference) {
            const config = vscode.workspace.getConfiguration('specsmd');
            await config.update('markdownEditor', selected.id, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Markdown editor set to: ${selected.label}`);
        }
        return selected.id;
    }

    return undefined;
}

/**
 * Opens a file, using the markdown editor preference for .md files.
 * @param filePath The absolute path to the file to open.
 * @returns Promise that resolves when the file is opened.
 */
export async function openFile(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);

    // Check if it's a markdown file
    if (filePath.toLowerCase().endsWith('.md')) {
        await openMarkdownFile(uri);
    } else {
        // For non-markdown files, use the default behavior
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }
}

/**
 * Opens a markdown file according to the user's preference.
 * @param uri The URI of the markdown file to open.
 */
export async function openMarkdownFile(uri: vscode.Uri): Promise<void> {
    const preference = getMarkdownEditorPreference();
    console.log(`[specsmd] Opening markdown with editor preference: "${preference}"`);
    await openMarkdownWithEditor(uri, preference);
}

/**
 * Opens a markdown file with the specified editor.
 * @param uri The URI of the markdown file to open.
 * @param editorId The editor ID to use.
 */
export async function openMarkdownWithEditor(uri: vscode.Uri, editorId: string): Promise<void> {
    console.log(`[specsmd] openMarkdownWithEditor called with editorId: "${editorId}"`);

    // Handle built-in options
    switch (editorId) {
        case 'preview':
            console.log('[specsmd] Using built-in markdown preview');
            await vscode.commands.executeCommand('markdown.showPreview', uri);
            return;

        case 'side-by-side': {
            console.log('[specsmd] Using side-by-side mode');
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
            await vscode.commands.executeCommand('markdown.showPreviewToSide', uri);
            return;
        }

        case 'default':
            console.log('[specsmd] Using default text editor');
            await openWithDefaultEditor(uri);
            return;
    }

    // Handle command-based editors (prefixed with 'cmd:')
    if (editorId.startsWith('cmd:')) {
        const command = editorId.substring(4);
        console.log(`[specsmd] Executing command: ${command}`);
        try {
            await vscode.commands.executeCommand(command, uri);
        } catch (error) {
            console.error(`[specsmd] Command "${command}" failed:`, error);
            vscode.window.showWarningMessage(`Failed to open with command "${command}", using default editor.`);
            await openWithDefaultEditor(uri);
        }
        return;
    }

    // Handle custom editors
    console.log(`[specsmd] Attempting to open with custom editor: "${editorId}"`);

    // Check if this editorId is a known valid editor from our detection
    const availableEditors = detectAvailableEditors();
    const knownEditor = availableEditors.find(e => e.id === editorId);

    if (knownEditor) {
        // It's a known editor from our detection - use vscode.openWith
        console.log(`[specsmd] Found known editor: ${knownEditor.label}`);
        try {
            await vscode.commands.executeCommand('vscode.openWith', uri, editorId);
            return;
        } catch (error) {
            console.error(`[specsmd] vscode.openWith failed:`, error);
        }
    }

    // For unknown/invalid editor IDs, open the file and show VS Code's editor picker
    console.log(`[specsmd] Editor "${editorId}" not found in available editors, showing picker`);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);

    // Show VS Code's "Open With..." picker so user can select a valid editor
    // The user should then use "specsmd: Select Markdown Editor" to pick from detected editors
    vscode.window.showInformationMessage(
        `Editor "${editorId}" not found. Use "specsmd: Select Markdown Editor" command to pick from available editors.`,
        'Select Editor'
    ).then(selection => {
        if (selection === 'Select Editor') {
            vscode.commands.executeCommand('specsmd.selectMarkdownEditor');
        }
    });
}

/**
 * Opens a file with the default text editor.
 */
async function openWithDefaultEditor(uri: vscode.Uri): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
}
