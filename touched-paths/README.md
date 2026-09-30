# Touched Paths Action

A GitHub Action that detects if a Pull Request touched files matching configured glob groups, outputting dynamic booleans (`true` / `false`) for each group.

For non-pull-request events (e.g. `push`, `workflow_dispatch`, `schedule`), the action skips immediately with minimal overhead.

## Features

- **Fast Execution**: Quickly exits on non-PR events.
- **Dynamic Outputs**: Generates dynamic step outputs corresponding directly to each defined group key.
- **Flexible YAML formats**: Supports group arrays, named objects, or standard group mappings.
- **Full Glob Support**: Supports `**`, `*`, file extensions, dotfiles, and negation powered by `picomatch`.
- **Renamed File Detection**: Tracks both the new file path and previous file path if a file was moved.

## Inputs

| Name | Description | Required | Default |
|------|-------------|----------|---------|
| `paths` | YAML array or map of group names and glob patterns | **Yes** | N/A |
| `token` | GitHub token for calling the GitHub PR API | No | `${{ github.token }}` |

## Outputs

Each group key provided in the `paths` input produces a dynamic step output of `'true'` or `'false'`.

## Example Usage

### 1. Basic Example with Conditional Steps

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  detect:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.changes.outputs.backend }}
      frontend: ${{ steps.changes.outputs.frontend }}
      docs: ${{ steps.changes.outputs.docs }}
    steps:
      - name: Check touched paths
        id: changes
        uses: ./touched-paths # or <owner>/<repo>/touched-paths@v1
        with:
          paths: |
            - backend:
                - 'src/backend/**/*.ts'
                - 'prisma/**'
            - frontend:
                - 'src/frontend/**'
                - 'package.json'
            - docs:
                - 'docs/**'
                - '*.md'

  backend-tests:
    needs: detect
    if: needs.detect.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:backend

  frontend-tests:
    needs: detect
    if: needs.detect.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:frontend
```

### 2. Supported `paths` YAML Formats

#### Array of Group Mappings (Recommended):
```yaml
paths: |
  - backend:
      - 'services/**'
      - 'api/**'
  - frontend:
      - 'web/**'
```

#### Array of Group Objects:
```yaml
paths: |
  - name: backend
    paths:
      - 'services/**'
  - group: frontend
    paths:
      - 'web/**'
```

#### Mapping Format:
```yaml
paths: |
  backend:
    - 'services/**'
  frontend:
    - 'web/**'
```
