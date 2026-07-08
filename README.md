# happyview-actions

GitHub Actions for deploying lexicons and scripts to a [HappyView](https://happyview.dev) instance.

Two actions, consumed by path ref:

- `gamesgamesgamesgamesgames/happyview-actions/deploy@v1` — deploy lexicons, query/procedure/record scripts, job scripts, and labeler scripts.
- `gamesgamesgamesgamesgames/happyview-actions/lint@v1` — offline validation of the same files.

## Conventions

Everything is discovered by directory layout — no manifest.

| Category             | Default pattern                           | Becomes                                            |
| -------------------- | ----------------------------------------- | -------------------------------------------------- |
| Lexicons             | `lexicons/**/*.json`                      | uploaded lexicons (NSID from `.id`)                |
| Route/record scripts | `lua/**/*.lua` (path mirrors the lexicon) | `xrpc.query` / `xrpc.procedure` / `record.index`   |
| Job scripts          | `jobs/**/*.lua`                           | `job.run:<type>` (`/` → `.`)                       |
| Labeler scripts      | `labelers/**/*.lua`                       | `labeler.apply:<nsid>` (or `labeler.apply:_actor`) |

Each category input is a newline-delimited list of glob patterns; a leading `!` excludes.

## Usage

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gamesgamesgamesgamesgames/happyview-actions/lint@v1
      - uses: gamesgamesgamesgamesgames/happyview-actions/deploy@v1
        with:
          happyview-url: ${{ vars.HAPPYVIEW_URL }}
          api-key: ${{ secrets.HAPPYVIEW_API_KEY }}
```

See each action's `action.yml` for the full input/output list.

## Development

```bash
npm install
npm test          # unit tests (Vitest)
npm run typecheck
npm run build     # bundles src → deploy/dist and lint/dist (committed)
```

### Releases

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/) on every merge to `main`. Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `feat!:`/a `BREAKING CHANGE:` footer for majors) — commit messages are linted on PRs. The moving `v1` tag is updated on each release, so consumers pinning `@v1` automatically get the latest compatible release.
