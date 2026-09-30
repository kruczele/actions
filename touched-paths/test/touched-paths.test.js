import { describe, it, expect } from 'vitest';
import { parseGroups } from '../src/parser';
import { checkTouchedGroups } from '../src/matcher';

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
    expect(result).toEqual({
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
    expect(result).toEqual({
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
    expect(result).toEqual({
      backend: ['server/**'],
      docs: ['*.md']
    });
  });

  it('throws on invalid or empty input', () => {
    expect(() => parseGroups('')).toThrow();
    expect(() => parseGroups('[]')).toThrow();
    expect(() => parseGroups('some: {}')).toThrow();
  });
});

describe('checkTouchedGroups', () => {
  it('correctly identifies touched groups via glob patterns', () => {
    const groups = {
      backend: ['src/backend/**/*.ts', 'prisma/**'],
      frontend: ['src/frontend/**', 'public/**'],
      docs: ['*.md', 'docs/**'],
      infra: ['terraform/**', '.github/workflows/*.yml']
    };

    const touchedFiles = [
      'src/backend/users/service.ts',
      'README.md',
      '.github/workflows/ci.yml'
    ];

    const result = checkTouchedGroups(groups, touchedFiles);

    expect(result).toEqual({
      backend: true,
      frontend: false,
      docs: true,
      infra: true
    });
  });

  it('handles dotfiles and single files properly', () => {
    const groups = {
      config: ['.eslintrc.json', 'package.json'],
      github: ['.github/**']
    };

    const touchedFiles = ['.eslintrc.json', '.github/workflows/test.yml'];

    const result = checkTouchedGroups(groups, touchedFiles);

    expect(result).toEqual({
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

    expect(result).toEqual({
      empty: false,
      other: false
    });
  });
});
