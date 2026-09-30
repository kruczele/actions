import fs from 'node:fs';

/**
 * Gets the value of an input.
 * 
 * @param {string} name 
 * @param {{ required?: boolean }} options 
 * @returns {string}
 */
export function getInput(name, { required = false } = {}) {
  const key = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const val = process.env[key] || '';
  if (required && !val.trim()) {
    throw new Error(`Input required and not supplied: ${name}`);
  }
  return val.trim();
}

/**
 * Sets an output parameter for the action using GITHUB_OUTPUT.
 * 
 * @param {string} name 
 * @param {string} value 
 */
export function setOutput(name, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  const strVal = String(value);

  if (outputPath) {
    // If output contains newlines, use delimiter syntax
    if (strVal.includes('\n')) {
      const delimiter = `delimiter_${Date.now()}`;
      fs.appendFileSync(outputPath, `${name}<<${delimiter}\n${strVal}\n${delimiter}\n`, 'utf8');
    } else {
      fs.appendFileSync(outputPath, `${name}=${strVal}\n`, 'utf8');
    }
  } else {
    // Fallback for older runners or local execution
    process.stdout.write(`::set-output name=${name}::${strVal}\n`);
  }
}

/**
 * Logs an info message.
 * 
 * @param {string} message 
 */
export function info(message) {
  process.stdout.write(`${message}\n`);
}

/**
 * Sets the action status to failed and logs error message.
 * 
 * @param {string | Error} message 
 */
export function setFailed(message) {
  process.exitCode = 1;
  const msg = message instanceof Error ? message.message : String(message);
  process.stderr.write(`::error::${msg}\n`);
}

/**
 * Retrieves the event context from GITHUB_EVENT_PATH.
 * 
 * @returns {{ eventName: string, payload: any, repo: string, apiUrl: string }}
 */
export function getContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  let payload = {};

  if (eventPath && fs.existsSync(eventPath)) {
    try {
      payload = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    } catch {
      payload = {};
    }
  }

  return {
    eventName: process.env.GITHUB_EVENT_NAME || '',
    payload,
    repo: process.env.GITHUB_REPOSITORY || '',
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com'
  };
}
