import { load } from 'js-yaml';

/**
 * Extracts a list of string patterns from various value structures.
 * 
 * @param {unknown} val 
 * @returns {string[]}
 */
export function extractPatterns(val) {
  if (!val) return [];
  if (typeof val === 'string' || typeof val === 'number') {
    const s = String(val).trim();
    return s ? [s] : [];
  }
  if (Array.isArray(val)) {
    return val
      .map(p => (typeof p === 'string' || typeof p === 'number' ? String(p).trim() : ''))
      .filter(Boolean);
  }
  if (typeof val === 'object') {
    const candidate = val.paths || val.patterns || val.files;
    if (candidate) {
      return extractPatterns(candidate);
    }
  }
  return [];
}

/**
 * Parses YAML paths input into a map of group names to pattern arrays.
 * 
 * Supports formats:
 * 1. Array of group objects:
 *    - backend:
 *        - 'src/backend/**'
 *    - frontend:
 *        - 'src/frontend/**'
 * 
 * 2. Array of named objects:
 *    - name: backend (or group: backend)
 *      paths:
 *        - 'src/backend/**'
 * 
 * 3. Mapping of groups:
 *    backend:
 *      - 'src/backend/**'
 *    frontend:
 *      - 'src/frontend/**'
 * 
 * @param {string} yamlContent 
 * @returns {Record<string, string[]>} Map of group name to glob patterns
 */
export function parseGroups(yamlContent) {
  if (!yamlContent || typeof yamlContent !== 'string') {
    throw new Error('paths input must be a non-empty YAML string');
  }

  const parsed = load(yamlContent);
  if (!parsed || (typeof parsed !== 'object')) {
    throw new Error('Invalid YAML format for paths');
  }

  const groups = {};

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;

      if (item.name || item.group) {
        const groupName = String(item.name || item.group).trim();
        const patternList = extractPatterns(item.paths || item.patterns || item.files);
        if (groupName && patternList.length > 0) {
          groups[groupName] = (groups[groupName] || []).concat(patternList);
        }
      } else {
        // e.g. { groupName: [path1, path2] }
        for (const [key, val] of Object.entries(item)) {
          const groupName = String(key).trim();
          const patternList = extractPatterns(val);
          if (groupName && patternList.length > 0) {
            groups[groupName] = (groups[groupName] || []).concat(patternList);
          }
        }
      }
    }
  } else {
    // Dictionary / mapping
    for (const [key, val] of Object.entries(parsed)) {
      const groupName = String(key).trim();
      const patternList = extractPatterns(val);
      if (groupName && patternList.length > 0) {
        groups[groupName] = (groups[groupName] || []).concat(patternList);
      }
    }
  }

  if (Object.keys(groups).length === 0) {
    throw new Error('No valid groups with paths found in paths input');
  }

  return groups;
}
