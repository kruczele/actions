import { fileURLToPath } from 'node:url';
import { getInput, setOutput, info, setFailed, getContext } from './core.js';
import { parseGroups } from './parser.js';
import { getPrTouchedFiles } from './files.js';
import { checkTouchedGroups } from './matcher.js';

export async function run() {
  try {
    const pathsInput = getInput('paths', { required: true });
    const groups = parseGroups(pathsInput);
    const groupNames = Object.keys(groups);
    info(`Configured groups: ${groupNames.join(', ')}`);

    const context = getContext();
    const pr = context.payload && context.payload.pull_request;

    // For non pull-request events, fast track all groups to 'true' without API calls
    if (!pr) {
      info('Not a pull request event. Fast-tracking all groups to true.');
      for (const group of groupNames) {
        setOutput(group, 'true');
        info(`Output '${group}': true`);
      }
      return;
    }

    const token = getInput('token') || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error('GitHub token is required to fetch changed files for the pull request.');
    }

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
