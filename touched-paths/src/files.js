/**
 * Fetches all changed files in the pull request via GitHub REST API.
 * 
 * @param {string} token 
 * @param {string} repoFullName 
 * @param {number} prNumber 
 * @param {string} apiUrl 
 * @returns {Promise<string[]>} List of touched file paths
 */
export async function getPrTouchedFiles(token, repoFullName, prNumber, apiUrl = 'https://api.github.com') {
  if (!token) {
    throw new Error('GitHub token is required to fetch changed files for the pull request.');
  }
  if (!repoFullName || !prNumber) {
    throw new Error('Repository full name and pull request number are required.');
  }

  const touchedFiles = new Set();
  let page = 1;

  while (true) {
    const url = `${apiUrl.replace(/\/$/, '')}/repos/${repoFullName}/pulls/${prNumber}/files?per_page=100&page=${page}`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'touched-paths-github-action'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`GitHub API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const files = await response.json();
    if (!Array.isArray(files) || files.length === 0) {
      break;
    }

    for (const file of files) {
      if (file.filename) {
        touchedFiles.add(file.filename);
      }
      if (file.previous_filename) {
        touchedFiles.add(file.previous_filename);
      }
    }

    if (files.length < 100) {
      break;
    }
    page++;
  }

  return Array.from(touchedFiles);
}
