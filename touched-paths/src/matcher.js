import pm from 'picomatch';

const picomatch = typeof pm === 'function' ? pm : (pm.default || pm);

/**
 * Checks which groups have at least one touched file matching any of their glob patterns.
 * 
 * @param {Record<string, string[]>} groups 
 * @param {string[]} touchedFiles 
 * @returns {Record<string, boolean>}
 */
export function checkTouchedGroups(groups, touchedFiles) {
  const results = {};

  for (const [group, patterns] of Object.entries(groups)) {
    if (!patterns || patterns.length === 0) {
      results[group] = false;
      continue;
    }

    const isMatch = picomatch(patterns, { dot: true });
    const hasMatch = touchedFiles.some(file => isMatch(file));
    results[group] = hasMatch;
  }

  return results;
}
