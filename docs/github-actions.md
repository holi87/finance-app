# Budget Tracker — GitHub Actions

## 1. Purpose

CI/CD ensures the project is buildable, testable, quality-consistent, and ready for Docker image builds.

## 2. Workflows

### ci.yml
Triggered on: `push` to main, `pull_request`

Jobs:
1. **lint** — ESLint across frontend, backend, shared packages
2. **typecheck** — TypeScript compilation check (no emit)
3. **test** — Run Vitest unit and integration tests
4. **build** — Build frontend and backend

Steps per job:
- Checkout repo
- Setup Node.js (LTS)
- Setup pnpm
- Install dependencies (with cache)
- Run the specific check

### docker.yml
Triggered on: push to main, release tags, workflow_dispatch

Steps:
- Checkout repo
- Setup Docker Buildx
- Build web image
- Build api image
- Optionally push to registry
- Tag with commit SHA and optionally `latest`

## 3. Caching

- Cache pnpm store between runs
- Cache Docker layers for faster builds
- Limit concurrency for competing runs

## 4. Quality gates

A PR must not be merged unless all pass:
- lint ✓
- typecheck ✓
- test ✓
- build ✓

Configure branch protection on `main` to enforce this.

## 5. Branching model

- `main` — protected branch
- Feature branches for development
- Merge via pull request
- CI must pass before merge

## 6. Image versioning

- Tag by commit SHA (always)
- Optionally tag with semver for releases
- `latest` tag only for main branch builds

## 7. Secrets

Only essential secrets in GitHub Actions:
- Registry credentials (if pushing images)
- Deploy secrets (if auto-deploying)

Never store secrets in the repository.

## 8. Definition of done

CI/CD is ready when:
- Every PR triggers quality validation
- Repo builds successfully
- Tests and typechecks are enforced
- Docker images build automatically
- Pipeline is consistent with monorepo structure
