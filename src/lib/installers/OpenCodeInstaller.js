const ToolInstaller = require('./ToolInstaller');
const path = require('path');

class OpenCodeInstaller extends ToolInstaller {
    get key() {
        return 'opencode';
    }

    get name() {
        return 'OpenCode';
    }

    get commandsDir() {
        return path.join('.opencode', 'command');
    }

    get detectPath() {
        return '.opencode';
    }

    /**
     * OpenCode requires 'agent: build' in command frontmatter.
     * This inserts the line before the closing '---' of existing frontmatter.
     */
    transformContent(content) {
        return content.replace(/^(---\n[\s\S]*?)(---)/, '$1agent: build\n$2');
    }
}

module.exports = OpenCodeInstaller;
