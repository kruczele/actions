import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseGroups } from '../src/parser.js';
import { checkTouchedGroups, globToRegExp } from '../src/matcher.js';

describe('parseGroups', () => {
  it('parses array of group objects (key -> paths)', () => {
    const yaml = `
- backend:
    - 'src/backend/**/*.ts'
    - 'prisma/**'
- frontend:
    - 'src/frontend/**'
    - 'package.json'
`;
    const result = parseGroups(yaml);
    assert.deepEqual(result, {
      backend: ['src/backend/**/*.ts', 'prisma/**'],
      frontend: ['src/frontend/**', 'package.json']
    });
  });

  it('parses array of named objects (name/group + paths)', () => {
    const yaml = `
- name: api
  paths:
    - 'api/**'
- group: web
  paths:
    - 'web/**'
`;
    const result = parseGroups(yaml);
    assert.deepEqual(result, {
      api: ['api/**'],
      web: ['web/**']
    });
  });

  it('parses dictionary format (group -> paths)', () => {
    const yaml = `
backend:
  - 'server/**'
docs:
  - '*.md'
`;
    const result = parseGroups(yaml);
    assert.deepEqual(result, {
      backend: ['server/**'],
      docs: ['*.md']
    });
  });

  it('parses json format directly', () => {
    const json = JSON.stringify([
      { backend: ['src/api/**/*.ts'] },
      { docs: ['README.md'] }
    ]);
    const result = parseGroups(json);
    assert.deepEqual(result, {
      backend: ['src/api/**/*.ts'],
      docs: ['README.md']
    });
  });

  it('throws on invalid or empty input', () => {
    assert.throws(() => parseGroups(''));
    assert.throws(() => parseGroups('[]'));
    assert.throws(() => parseGroups('some: {}'));
  });
});

describe('checkTouchedGroups & glob matching', () => {
  it('correctly identifies touched groups via glob patterns', () => {
    const groups = {
      backend: ['src/backend/**/*.ts', 'prisma/**'],
      frontend: ['src/frontend/**', 'public/**'],
      docs: ['*.md', 'docs/**'],
      infra: ['terraform/**', '.github/workflows/*.yml'],
      nested: ['packages/{app,core}/**/*.js']
    };

    const touchedFiles = [
      'src/backend/users/service.ts',
      'README.md',
      '.github/workflows/ci.yml',
      'packages/app/dist/bundle.js'
    ];

    const result = checkTouchedGroups(groups, touchedFiles);

    assert.deepEqual(result, {
      backend: true,
      frontend: false,
      docs: true,
      infra: true,
      nested: true
    });
  });

  it('handles dotfiles and single files properly', () => {
    const groups = {
      config: ['.eslintrc.json', 'package.json'],
      github: ['.github/**']
    };

    const touchedFiles = ['.eslintrc.json', '.github/workflows/test.yml'];

    const result = checkTouchedGroups(groups, touchedFiles);

    assert.deepEqual(result, {
      config: true,
      github: true
    });
  });

  it('returns false for groups with no matched files or empty patterns', () => {
    const groups = {
      empty: [],
      other: ['src/other/**']
    };

    const touchedFiles = ['src/backend/index.js'];
    const result = checkTouchedGroups(groups, touchedFiles);

    assert.deepEqual(result, {
      empty: false,
      other: false
    });
  });
});
