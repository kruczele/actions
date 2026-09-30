/**
 * Converts a glob pattern into a regular expression.
 * 
 * Supports:
 * - `**` (matches across directories)
 * - `*` (matches within single path segment)
 * - `?` (matches single non-separator character)
 * - `{a,b,c}` (brace expansion)
 * - `!pattern` (negation)
 * 
 * @param {string} glob 
 * @returns {{ regex: RegExp, isNegative: boolean }}
 */
export function globToRegExp(glob) {
  let pattern = glob.trim();
  let isNegative = false;

  if (pattern.startsWith('!')) {
    isNegative = true;
    pattern = pattern.slice(1);
  }

  // Normalize leading ./ or /
  pattern = pattern.replace(/^\.?\/+/, '');

  let regexStr = '';
  let inGroup = false;

  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];

    if (c === '*' && pattern[i + 1] === '*') {
      // "**/" at start or middle matches zero or more path segments
      if (pattern[i + 2] === '/') {
        regexStr += '(?:.+/)?';
        i += 2;
      } else {
        regexStr += '.*';
        i += 1;
      }
    } else if (c === '*') {
      regexStr += '[^/]*';
    } else if (c === '?') {
      regexStr += '[^/]';
    } else if (c === '{') {
      regexStr += '(?:';
      inGroup = true;
    } else if (c === '}' && inGroup) {
      regexStr += ')';
      inGroup = false;
    } else if (c === ',' && inGroup) {
      regexStr += '|';
    } else if (['.', '+', '^', '$', '(', ')', '|', '[', ']', '\\'].includes(c)) {
      regexStr += `\\${c}`;
    } else {
      regexStr += c;
    }
  }

  return {
    regex: new RegExp(`^${regexStr}$`),
    isNegative
  };
}

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

    const compiledMatchers = patterns.map(p => globToRegExp(p));

    results[group] = touchedFiles.some(file => {
      const normalizedFile = file.replace(/^\.?\/+/, '');
      return compiledMatchers.some(({ regex, isNegative }) => {
        const matches = regex.test(normalizedFile);
        return isNegative ? !matches : matches;
      });
    });
  }

  return results;
}
