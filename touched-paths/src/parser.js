function stripQuotes(str) {
  let s = str.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function extractFromObject(obj) {
  const groups = {};
  if (!obj || typeof obj !== 'object') return groups;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (!item || typeof item !== 'object') continue;
      if (item.name || item.group) {
        const name = String(item.name || item.group).trim();
        const paths = item.paths || item.patterns || item.files || [];
        const list = (Array.isArray(paths) ? paths : [paths]).map(String).map(s => s.trim()).filter(Boolean);
        if (name && list.length > 0) {
          groups[name] = (groups[name] || []).concat(list);
        }
      } else {
        for (const [k, v] of Object.entries(item)) {
          const name = String(k).trim();
          const list = (Array.isArray(v) ? v : [v]).map(String).map(s => s.trim()).filter(Boolean);
          if (name && list.length > 0) {
            groups[name] = (groups[name] || []).concat(list);
          }
        }
      }
    }
  } else {
    for (const [k, v] of Object.entries(obj)) {
      const name = String(k).trim();
      let list = [];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const raw = v.paths || v.patterns || v.files;
        list = (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
      } else if (Array.isArray(v)) {
        list = v;
      } else if (v) {
        list = [v];
      }
      const cleaned = list.map(String).map(s => s.trim()).filter(Boolean);
      if (name && cleaned.length > 0) {
        groups[name] = (groups[name] || []).concat(cleaned);
      }
    }
  }

  return groups;
}

/**
 * Parses YAML / JSON paths configuration without any external dependencies.
 * 
 * Supports:
 * - Array of group mappings (`- backend:\n - 'src/**'`)
 * - Array of group objects (`- name: backend\n paths:\n - 'src/**'`)
 * - Key-value group mappings (`backend:\n - 'src/**'`)
 * - Pure JSON equivalents
 * 
 * @param {string} yamlContent 
 * @returns {Record<string, string[]>}
 */
export function parseGroups(yamlContent) {
  if (!yamlContent || typeof yamlContent !== 'string') {
    throw new Error('paths input must be a non-empty YAML string');
  }

  const trimmed = yamlContent.trim();
  if (!trimmed) {
    throw new Error('paths input cannot be empty');
  }

  // Attempt JSON parse first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const groups = extractFromObject(parsed);
      if (Object.keys(groups).length > 0) {
        return groups;
      }
    } catch {
      // Fall through to YAML parser
    }
  }

  const lines = yamlContent.split(/\r?\n/);
  const groups = {};
  let currentGroup = null;

  for (let rawLine of lines) {
    // Strip comments
    const commentIdx = rawLine.indexOf('#');
    const line = (commentIdx !== -1 ? rawLine.slice(0, commentIdx) : rawLine).trimEnd();
    const trimmedLine = line.trim();

    if (!trimmedLine) continue;

    // Check for "- name: <group>" or "- group: <group>"
    const nameMatch = trimmedLine.match(/^-\s+(?:name|group):\s*(.+)$/i);
    if (nameMatch) {
      currentGroup = stripQuotes(nameMatch[1]);
      if (!groups[currentGroup]) groups[currentGroup] = [];
      continue;
    }

    // Check for "- <group>:"
    const listGroupMatch = trimmedLine.match(/^-\s+([^:]+):\s*$/);
    if (listGroupMatch) {
      currentGroup = stripQuotes(listGroupMatch[1]);
      if (!groups[currentGroup]) groups[currentGroup] = [];
      continue;
    }

    // Check for "<group>:" at top-level / dictionary level
    const topGroupMatch = trimmedLine.match(/^([^:-][^:]*):\s*$/);
    if (topGroupMatch) {
      const key = stripQuotes(topGroupMatch[1]);
      if (!['paths', 'patterns', 'files'].includes(key.toLowerCase())) {
        currentGroup = key;
        if (!groups[currentGroup]) groups[currentGroup] = [];
        continue;
      }
    }

    // Check for list item paths: "- 'some/path/**'"
    const itemMatch = trimmedLine.match(/^-\s+(.+)$/);
    if (itemMatch && currentGroup) {
      const pathVal = stripQuotes(itemMatch[1]);
      if (pathVal && !pathVal.endsWith(':')) {
        groups[currentGroup].push(pathVal);
      }
    }
  }

  const cleanGroups = {};
  for (const [key, paths] of Object.entries(groups)) {
    if (paths && paths.length > 0) {
      cleanGroups[key] = paths;
    }
  }

  if (Object.keys(cleanGroups).length === 0) {
    throw new Error('No valid groups with paths found in paths input');
  }

  return cleanGroups;
}
