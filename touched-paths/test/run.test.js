import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { run } from '../src/index.js';

describe('touched-paths runner flow', () => {
  let tmpDir;
  let outputFile;
  let eventFile;
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'action-test-'));
    outputFile = path.join(tmpDir, 'output.txt');
    eventFile = path.join(tmpDir, 'event.json');
    fs.writeFileSync(outputFile, '');
    
    process.env = { ...originalEnv };
    process.env.GITHUB_OUTPUT = outputFile;
    process.env.GITHUB_EVENT_PATH = eventFile;
    process.env.GITHUB_REPOSITORY = 'owner/repo';
    process.env.GITHUB_TOKEN = 'test-token';
    process.exitCode = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
    process.exitCode = 0;
    globalThis.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('fast-tracks all groups to true on non-pull-request events', async () => {
    fs.writeFileSync(eventFile, JSON.stringify({ push: { ref: 'refs/heads/main' } }));
    process.env.GITHUB_EVENT_NAME = 'push';
    process.env.INPUT_PATHS = `
- backend:
    - 'src/backend/**'
- frontend:
    - 'src/frontend/**'
`;

    let logged = '';
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk) => {
      logged += chunk;
      return true;
    };

    try {
      await run();
    } finally {
      process.stdout.write = origWrite;
    }

    const outputContent = fs.readFileSync(outputFile, 'utf8');
    assert.ok(outputContent.includes('backend=true\n'));
    assert.ok(outputContent.includes('frontend=true\n'));
    assert.match(logged, /Not a pull request event\. Fast-tracking all groups to true\./);
    assert.equal(process.exitCode, 0);
  });

  it('processes PR touched files and sets dynamic outputs', async () => {
    fs.writeFileSync(eventFile, JSON.stringify({
      pull_request: {
        number: 42
      }
    }));
    process.env.GITHUB_EVENT_NAME = 'pull_request';
    process.env.INPUT_PATHS = `
- backend:
    - 'services/**'
- frontend:
    - 'frontend/**'
- database:
    - 'prisma/**'
    - 'migrations/**'
`;

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [
        { filename: 'services/auth/index.ts' },
        { filename: 'frontend/src/App.vue' },
        { filename: 'docs/guide.md', previous_filename: 'docs/old-guide.md' }
      ]
    });

    await run();

    const outputContent = fs.readFileSync(outputFile, 'utf8');
    assert.ok(outputContent.includes('backend=true\n'));
    assert.ok(outputContent.includes('frontend=true\n'));
    assert.ok(outputContent.includes('database=false\n'));
    assert.equal(process.exitCode, 0);
  });

  it('fails if token is missing on PR events', async () => {
    fs.writeFileSync(eventFile, JSON.stringify({
      pull_request: {
        number: 10
      }
    }));
    process.env.GITHUB_EVENT_NAME = 'pull_request';
    process.env.INPUT_PATHS = `
- backend:
    - 'src/**'
`;
    delete process.env.GITHUB_TOKEN;
    delete process.env.INPUT_TOKEN;

    let errLogged = '';
    const origErrWrite = process.stderr.write;
    process.stderr.write = (chunk) => {
      errLogged += chunk;
      return true;
    };

    try {
      await run();
    } finally {
      process.stderr.write = origErrWrite;
    }

    assert.equal(process.exitCode, 1);
    assert.match(errLogged, /GitHub token is required/);
    process.exitCode = 0;
  });
});
