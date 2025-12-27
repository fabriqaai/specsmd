# SpecsMD VS Code Extension

A VS Code extension for managing AI-DLC (AI Development Life Cycle) artifacts including intents, units, stories, and bolts.

## Sidebar Views

The extension provides a sidebar panel with three tabs:

### Bolts Tab

The default view showing bolt execution status and progress.

**Sections:**
- **Current Focus** - Active bolts being worked on with stage progress
- **Up Next Queue** - Pending bolts ready to be started
- **Recent Activity** - Timeline of bolt and stage completions

**Features:**
- Click bolt cards to expand/collapse details
- View stage completion status (checkmarks for complete, dots for in-progress)
- Start or continue bolts via the action buttons
- Filter activity by type (All, Stages, Bolts)
- Resize the activity section by dragging the divider

### Specs Tab

Hierarchical view of your project's specifications.

**Hierarchy:**
```
Intent (🎯) → Units (📚) → Stories (📝)
```

**Features:**
- Click intent/unit headers to expand/collapse children
- Click the magnifier icon (🔍) next to an intent to open `requirements.md`
- Click the magnifier icon (🔍) next to a unit to open `unit-brief.md`
- Click a story to open the story markdown file
- Progress indicators show completion percentage for each intent

### Overview Tab

High-level project metrics and quick actions.

**Sections:**
- **Project Metrics** - Active bolts, completion rates, story counts
- **Intents** - Quick access to all intents with progress
- **Standards** - Project standards documents
- **Suggested Actions** - AI-recommended next steps
- **Website Link** - Quick link to specs.md documentation

## Tab Selection

Tabs persist across VS Code sessions. The extension saves your active tab choice to workspace state.

**Keyboard:** Not currently supported
**Mouse:** Click tab headers (Bolts, Specs, Overview) to switch views

## Architecture

The extension uses a hybrid rendering approach:
- **Bolts view**: Lit web components with reactive data binding
- **Specs/Overview views**: Server-rendered HTML with event delegation

This allows for rich interactivity in the Bolts view while keeping Specs/Overview lightweight.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript and bundle webview
npm run compile

# Watch for changes
npm run watch

# Run tests
npm test
```

## File Structure

```
src/
├── sidebar/           # Extension host code
│   ├── webviewProvider.ts   # Main provider
│   └── webviewMessaging.ts  # Message types
├── webview/           # Webview UI code
│   ├── components/    # Lit components
│   │   ├── app.ts     # Root component
│   │   ├── tabs/      # Tab navigation
│   │   └── bolts/     # Bolts view components
│   ├── html.ts        # Server-rendered HTML generators
│   └── styles.ts      # CSS styles
├── parser/            # Memory bank parsing
└── state/             # Centralized state management
```
