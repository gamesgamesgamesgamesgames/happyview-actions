# happyview-actions

GitHub Actions for checking, testing and deploying a [HappyView](https://happyview.dev) project. They run [`hpy`](https://github.com/happyproto/cli), the HappyProto command line, so CI does exactly what `hpy happyview check`, `test` and `deploy` do on your machine.

> **Upgrading from v1?** `@v1` reads HappyView v2's file layout (`lexicons/`, `lua/`, `jobs/`, `labelers/`) and only works with HappyView v2. For a HappyView v3 project, the directory holding `happyview.toml`, use `@v2`. See [v1](#v1-happyview-v2-only).

Four actions, consumed by path ref:

| Action | Runs |
| --- | --- |
| `gamesgamesgamesgamesgames/happyview-actions/setup-hpy@v2` | Installs a pinned `hpy` and caches what it downloads. Run it first. |
| `gamesgamesgamesgamesgames/happyview-actions/check@v2` | `hpy happyview check`: builds the project without serving it and fails on any error. |
| `gamesgamesgamesgamesgames/happyview-actions/test@v2` | `hpy happyview test`: runs the project's `*.test.*` files. |
| `gamesgamesgamesgamesgames/happyview-actions/deploy@v2` | `hpy happyview deploy --yes`: makes an instance match the project, its plugins from `happyview.lock` and then its lexicons, scripts and modules. |

The actions run on Linux and macOS runners.

## Usage

```yaml
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: gamesgamesgamesgamesgames/happyview-actions/setup-hpy@v2
      - uses: gamesgamesgamesgamesgames/happyview-actions/check@v2
      - uses: gamesgamesgamesgamesgames/happyview-actions/test@v2

  deploy:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: gamesgamesgamesgamesgames/happyview-actions/setup-hpy@v2
      - uses: gamesgamesgamesgamesgames/happyview-actions/deploy@v2
        with:
          url: ${{ vars.HAPPYVIEW_URL }}
          api-key: ${{ secrets.HAPPYVIEW_API_KEY }}
```

For a project in a subdirectory, give every action the same `working-directory`.

To preview a deploy, for example on a pull request, set `dry-run: 'true'`. It shows what would change on the instance and changes nothing.

### The API key

Create the key in the instance's dashboard and store it as a repository secret. A deploy needs these permissions:

- `project:deploy`
- `plugins:read`
- `plugins:create`
- `plugins:delete`, only with `prune-plugins: 'true'`

A deploy accepts, on your behalf, the capabilities `happyview.lock` records for each plugin it installs or moves. Review a change to those capabilities in the pull request that changes the lock. Then commit the lock that `hpy happyview check` writes, since `check` and `test` run with `--locked` here and fail on a lock that no longer matches `happyview.toml`.

## Inputs

### setup-hpy

| Input | Default | |
| --- | --- | --- |
| `version` | `1.0.0-beta.3` | The exact hpy release to install, from its beta channel. |
| `working-directory` | `.` | The project whose `happyview.lock` keys the cache of the HappyView binary and plugins. |
| `cache` | `true` | Cache hpy, and the HappyView binary and plugins it downloads, between runs. |

Outputs: `version`, `path` (the directory added to `PATH`) and `cache-hit` (whether hpy came from the cache).

### check

| Input | Default | |
| --- | --- | --- |
| `working-directory` | `.` | The project, the directory holding `happyview.toml`. |
| `locked` | `true` | Fail rather than update `happyview.lock` when it no longer matches `happyview.toml`. |

### test

As `check`, and:

| Input | Default | |
| --- | --- | --- |
| `filter` | | Only run test files whose path contains this. |

### deploy

| Input | Default | |
| --- | --- | --- |
| `url` | required | The instance, e.g. `https://api.example.com`. |
| `api-key` | required | An `hv_` API key from the instance. Use a secret. |
| `working-directory` | `.` | The project, the directory holding `happyview.toml`. |
| `dry-run` | `false` | Show what would change on the instance without changing it. |
| `prune-plugins` | `false` | Also uninstall interpreters and libraries `happyview.lock` doesn't list. |

## v1 (HappyView v2 only)

`deploy@v1` and `lint@v1` predate `hpy` and HappyView v3 projects. They discover files by HappyView v2's directory layout and upload them through its admin API:

| Category | Default pattern | Becomes |
| --- | --- | --- |
| Lexicons | `lexicons/**/*.json` | uploaded lexicons (NSID from `.id`) |
| Route/record scripts | `lua/**/*.lua` (path mirrors the lexicon) | `xrpc.query` / `xrpc.procedure` / `record.index` |
| Job scripts | `jobs/**/*.lua` | `job.run:<type>` (`/` → `.`) |
| Labeler scripts | `labelers/**/*.lua` | `labeler.apply:<nsid>` (or `labeler.apply:_actor`) |

They still work for an instance running HappyView v2. Their inputs are in the [`v1` tag's README](https://github.com/gamesgamesgamesgamesgames/happyview-actions/tree/v1#readme).

## Development

The actions are composite actions with no build step. CI runs each one against `fixtures/project`, a project made by `hpy happyview create` with a test added. The deploy job boots the HappyView that project pins on SQLite, seeds a key holding only the permissions above, and deploys to it.

### Releases

Releases are automated with [semantic-release](https://semantic-release.gitbook.io/) on every merge to `main`. Commits must follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, and `feat!:` or a `BREAKING CHANGE:` footer for a major. Commit messages are linted on pull requests. Each release moves its major's tag, so consumers pinning `@v2` get the latest compatible release.
