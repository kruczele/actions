import { fileURLToPath } from 'node:url';
import { getInput, setOutput, info, setFailed, getContext } from './core.js';
import { parseGroups } from './parser.js';
import { getPrTouchedFiles } from './files.js';
import { checkTouchedGroups } from './matcher.js';

export async function run() {
  try {
    const context = getContext();
    const pr = context.payload && context.payload.pull_request;

    // For non pull-request events, do nothing quickly
    if (!pr) {
      info('Not a pull request event. Skipping.');
      return;
    }

    const pathsInput = getInput('paths', { required: true });
    const token = getInput('token') || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GitHub token is required to fetch changed files for the pull request.');
    }

    const groups = parseGroups(pathsInput);
    const groupNames = Object.keys(groups);
    info(`Configured groups: ${groupNames.join(', ')}`);

    const touchedFiles = await getPrTouchedFiles(
      token,
      context.repo || (context.payload.repository && context.payload.repository.full_name),
      pr.number,
      context.apiUrl
    );
    info(`Found ${touchedFiles.length} touched file(s) in pull request #${pr.number}.`);

    const results = checkTouchedGroups(groups, touchedFiles);

    for (const [group, isTouched] of Object.entries(results)) {
      const outputValue = isTouched ? 'true' : 'false';
      setOutput(group, outputValue);
      info(`Output '${group}': ${outputValue}`);
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

// Direct execution check
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run();
}
