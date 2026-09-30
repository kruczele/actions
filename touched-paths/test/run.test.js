import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { run } from '../src/index.js';

describe('touched-paths runner flow', () => {
  let tmpDir;
  let outputFile;
  let eventFile;
  const originalEnv = { ...process.env };

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
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('does nothing and skips immediately on non-pull-request events', async () => {
    fs.writeFileSync(eventFile, JSON.stringify({ push: { ref: 'refs/heads/main' } }));
    process.env.GITHUB_EVENT_NAME = 'push';

    const infoSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await run();

    const outputContent = fs.readFileSync(outputFile, 'utf8');
    expect(outputContent).toBe('');
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('Not a pull request event. Skipping.'));
    expect(process.exitCode).toBe(0);
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { filename: 'services/auth/index.ts' },
        { filename: 'frontend/src/App.vue' },
        { filename: 'docs/guide.md', previous_filename: 'docs/old-guide.md' }
      ]
    });

    await run();

    const outputContent = fs.readFileSync(outputFile, 'utf8');
    expect(outputContent).toContain('backend=true\n');
    expect(outputContent).toContain('frontend=true\n');
    expect(outputContent).toContain('database=false\n');
    expect(process.exitCode).toBe(0);
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

    const errorSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await run();

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('GitHub token is required')
    );
  });
});
