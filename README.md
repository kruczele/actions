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

### [`touched-paths`](./touched-paths/)

Detects if a Pull Request touched files matching configured glob groups, outputting dynamic booleans (`true` / `false`) for each group.

- **Non-PR Events**: Automatically fast-tracks all groups to `true` (with zero API calls) so workflows run completely on branches/pushes.
- **Pull Request Events**: Queries the GitHub API to match changed file paths against configured glob groups.
- **Zero Dependencies**: Pure Node 24 with native glob matching and YAML parsing.

#### Example

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
