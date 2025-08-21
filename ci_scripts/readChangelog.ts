import * as fs from 'fs';
import * as path from 'path';

interface ChangelogEntry {
    type: 'feat' | 'bug';
    content: string;
    filename: string;
    prNumber: string;
}

function readChangelogFiles(): ChangelogEntry[] {
    const changesDir = path.join(process.cwd(), '.changes');
    
    if (!fs.existsSync(changesDir)) {
        console.log('No .changes directory found');
        return [];
    }

    const files = fs.readdirSync(changesDir);
    // Process all .md files except README.md
    const changelogFiles = files.filter(file => 
        file.endsWith('.md') && file !== 'README.md'
    );

    const entries: ChangelogEntry[] = [];

    for (const file of changelogFiles) {
        const filePath = path.join(changesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        
        if (content) {
            // Parse filename format: {pr-number}-{bug/feat}.md
            const nameWithoutExt = file.replace('.md', '');
            const parts = nameWithoutExt.split('-');
            
            // First part is PR number, last part is type
            const prNumber = parts[0];
            const typeStr = parts[parts.length - 1];
            const type: 'feat' | 'bug' = typeStr === 'bug' ? 'bug' : 'feat';
            
            entries.push({
                type,
                content,
                filename: file,
                prNumber
            });
        }
    }

    return entries;
}

function updateChangelog(entries: ChangelogEntry[], version: string): void {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) {
        console.error('CHANGELOG.md not found');
        process.exit(1);
    }

    let changelog = fs.readFileSync(changelogPath, 'utf-8');

    // Check if version section already exists
    const versionPattern = `## [${version}]`;
    const versionIndex = changelog.indexOf(versionPattern);

    if (versionIndex !== -1) {
        console.log(`Version ${version} section already exists, updating it...`);
        // Find the end of this version section (next ## heading or end of file)
        const nextSectionIndex = changelog.indexOf('\n## [', versionIndex + 1);
        const sectionEndIndex = nextSectionIndex === -1 ? changelog.length : nextSectionIndex;

        // Remove the existing version section content (keep the header)
        const headerEndIndex = changelog.indexOf('\n', versionIndex) + 1;
        changelog = changelog.slice(0, headerEndIndex) + changelog.slice(sectionEndIndex);
    }

    // Group entries by type
    const features = entries.filter(e => e.type === 'feat');
    const bugfixes = entries.filter(e => e.type === 'bug');

    // Create the new version section content
    const today = new Date().toISOString().split('T')[0];
    let newSection = '';

    // If version section doesn't exist, create the header
    if (versionIndex === -1) {
        newSection += `\n## [${version}] - ${today}\n\n`;
    }

    if (features.length > 0) {
        newSection += '### Features\n\n';
        features.forEach(entry => {
            const repoUrl = getRepoUrl();
            const prLink = repoUrl ? `[#${entry.prNumber}](${repoUrl}/pull/${entry.prNumber})` : `#${entry.prNumber}`;
            newSection += `- ${entry.content} ${prLink}\n`;
        });
        newSection += '\n';
    }

    if (bugfixes.length > 0) {
        newSection += '### Fixes\n\n';
        bugfixes.forEach(entry => {
            const repoUrl = getRepoUrl();
            const prLink = repoUrl ? `[#${entry.prNumber}](${repoUrl}/pull/${entry.prNumber})` : `#${entry.prNumber}`;
            newSection += `- ${entry.content} ${prLink}\n`;
        });
        newSection += '\n';
    }

    // Insert the new section
    if (versionIndex === -1) {
        // Version doesn't exist, find where to insert it (after any existing versions)
        const firstVersionIndex = changelog.indexOf('\n## [');
        const insertIndex = firstVersionIndex === -1 ? changelog.length : firstVersionIndex;
        changelog = changelog.slice(0, insertIndex) + newSection + changelog.slice(insertIndex);
    } else {
        // Version exists, insert after the header
        const headerEndIndex = changelog.indexOf('\n', versionIndex) + 1;
        changelog = changelog.slice(0, headerEndIndex) + newSection + changelog.slice(headerEndIndex);
    }

    fs.writeFileSync(changelogPath, changelog);
    console.log(`Updated CHANGELOG.md with ${entries.length} entries for version ${version}`);
}

function getRepoUrl(): string | null {
    try {
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
            if (packageJson.repository && packageJson.repository.url) {
                // Convert git+https://github.com/user/repo.git to https://github.com/user/repo
                return packageJson.repository.url
                    .replace('git+', '')
                    .replace('.git', '');
            }
        }
        return null;
    } catch (error) {
        console.warn('Could not extract repository URL from package.json');
        return null;
    }
}

function deleteChangelogFiles(entries: ChangelogEntry[]): void {
    const changesDir = path.join(process.cwd(), '.changes');

    for (const entry of entries) {
        const filePath = path.join(changesDir, entry.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted ${entry.filename}`);
        }
    }
}

function main(): void {
    const version = process.argv[2];

    if (!version) {
        console.error('Usage: ts-node read_changelog.ts <version>');
        process.exit(1);
    }

    console.log(`Processing changelog files for version ${version}...`);

    const entries = readChangelogFiles();

    if (entries.length === 0) {
        console.log('No changelog files found, skipping changelog update');
        return;
    }

    console.log(`Found ${entries.length} changelog entries:`);
    entries.forEach(entry => {
        console.log(`  - ${entry.type}: ${entry.content} (${entry.filename})`);
    });

    updateChangelog(entries, version);
    deleteChangelogFiles(entries);

    console.log('Changelog processing completed successfully');
}

if (require.main === module) {
    main();
}