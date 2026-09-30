# Actions

A collection of custom GitHub Actions that I commonly use and need across my projects.

All actions in this repository are designed to be as simple, fast, and dependency-free as possible (pure Node with zero npm dependencies and zero setup steps).

> [!WARNING]
> If you want to use any of these actions in your own workflows, the **only recommended way is to hard-pin them to a full commit SHA**:
> ```yaml
> uses: kruczele/actions/<action-name>@<commit-sha>
> ```
> Tags and branch references may change without notice.

---

## Available Actions

| Action | Description | Documentation |
|---|---|---|
| [`touched-paths`](./touched-paths/) | Checks if a Pull Request touched files matching configured glob groups, outputting dynamic booleans for each group. Fast-tracks non-PR runs to `true`. | [Documentation →](./touched-paths/README.md) |

---

## Quick Example: `touched-paths`

```yaml
jobs:
  check-changes:
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.changes.outputs.backend }}
      frontend: ${{ steps.changes.outputs.frontend }}
    steps:
      - name: Check touched paths
        id: changes
        uses: kruczele/actions/touched-paths@<commit-sha>
        with:
          paths: |
            - backend:
                - 'src/backend/**/*.ts'
                - 'prisma/**'
            - frontend:
                - 'src/frontend/**'
                - 'package.json'

  backend-ci:
    needs: check-changes
    if: needs.check-changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run test:backend
```

For detailed configuration options and syntax formats, see the [touched-paths README](./touched-paths/README.md).
