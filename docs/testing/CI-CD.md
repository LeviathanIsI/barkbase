# CI/CD Pipeline

## Overview

BarkBase uses GitHub Actions for continuous integration and deployment.

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Push/PR   │───▶│    Lint     │───▶│    Test     │───▶│    Build    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                                │
                   ┌─────────────┐    ┌─────────────┐           ▼
                   │   Deploy    │◀───│  Security   │◀──────────┘
                   │  (manual)   │    │    Scan     │
                   └─────────────┘    └─────────────┘
```

---

## GitHub Actions Workflows

### CI Pipeline

**File:** `.github/workflows/ci.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### 1. Lint Job

```yaml
lint:
  name: Lint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: frontend
      run: npm ci

    - name: Run ESLint
      working-directory: frontend
      run: npm run lint
```

#### 2. Test Job

```yaml
test-frontend:
  name: Frontend Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: frontend
      run: npm ci

    - name: Run unit tests
      working-directory: frontend
      run: npm run test -- --coverage --reporter=verbose

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        directory: frontend/coverage
        flags: frontend
        fail_ci_if_error: false
```

#### 3. Build Job

```yaml
build:
  name: Build
  runs-on: ubuntu-latest
  needs: [lint, test-frontend]
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: frontend
      run: npm ci

    - name: Build frontend
      working-directory: frontend
      run: npm run build

    - name: Upload build artifacts
      uses: actions/upload-artifact@v4
      with:
        name: frontend-build
        path: frontend/dist/
        retention-days: 7
```

#### 4. Security Scan Job

```yaml
security-scan:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json

    - name: Install dependencies
      working-directory: frontend
      run: npm ci

    - name: Run npm audit
      working-directory: frontend
      run: npm audit --audit-level=high || true
      continue-on-error: true
```

---

### Deploy Pipeline (Planned)

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  AWS_REGION: us-east-2

jobs:
  deploy-frontend:
    name: Deploy Frontend
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          VITE_COGNITO_USER_POOL_ID: ${{ secrets.VITE_COGNITO_USER_POOL_ID }}
          VITE_COGNITO_CLIENT_ID: ${{ secrets.VITE_COGNITO_CLIENT_ID }}
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy to S3
        run: |
          aws s3 sync frontend/dist/ s3://${{ secrets.S3_BUCKET }}/ \
            --delete \
            --cache-control "public, max-age=31536000, immutable" \
            --exclude "*.html"
          aws s3 cp frontend/dist/index.html s3://${{ secrets.S3_BUCKET }}/ \
            --cache-control "no-cache, no-store, must-revalidate"

      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    environment: ${{ github.event.inputs.environment }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install SAM CLI
        uses: aws-actions/setup-sam@v2

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Build and deploy
        run: |
          sam build
          sam deploy \
            --no-confirm-changeset \
            --no-fail-on-empty-changeset \
            --stack-name barkbase-${{ github.event.inputs.environment }} \
            --parameter-overrides Environment=${{ github.event.inputs.environment }}
```

---

## Pre-commit Hooks

**File:** `.husky/pre-commit`

Pre-commit hooks run automatically before each commit to ensure code quality.

### Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix"
    ],
    "package.json": [
      "sort-package-json"
    ]
  }
}
```

### What Runs on Commit

1. **ESLint** - Lints and auto-fixes JavaScript/TypeScript files
2. **Prettier** - Formats code (if configured)
3. **Type Check** - TypeScript compilation check (optional)

### Bypassing Pre-commit Hooks

```bash
# Skip hooks (use sparingly)
git commit --no-verify -m "message"

# Or set environment variable
HUSKY=0 git commit -m "message"
```

---

## Pre-push Hooks

**File:** `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests before push
cd frontend && npm test -- --run
```

### What Runs on Push

1. **Unit Tests** - All Vitest tests run
2. **Build Check** - Ensures production build succeeds (optional)

### Bypassing Pre-push Hooks

```bash
# Skip hooks
git push --no-verify

# Or
HUSKY=0 git push
```

---

## Environment Variables

### CI Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_VERSION` | Node.js version to use | Yes |
| `AWS_REGION` | AWS region for deployment | Yes |

### Repository Secrets (for Deploy)

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `VITE_API_URL` | Backend API URL |
| `VITE_COGNITO_USER_POOL_ID` | Cognito user pool ID |
| `VITE_COGNITO_CLIENT_ID` | Cognito app client ID |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking |
| `S3_BUCKET` | S3 bucket for frontend |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |

---

## Deployment Process

### Staging Deployment

```bash
# Automatic on merge to develop (if configured)
# Or manual trigger:
gh workflow run deploy.yml -f environment=staging
```

### Production Deployment

```bash
# Manual trigger only:
gh workflow run deploy.yml -f environment=production

# Requires approval from repository admins
```

### Rollback Procedure

```bash
# 1. Find previous working commit
git log --oneline -10

# 2. Create rollback branch
git checkout -b hotfix/rollback-to-<commit>

# 3. Reset to previous version
git reset --hard <commit>
git push origin hotfix/rollback-to-<commit>

# 4. Create PR and fast-track merge
# 5. Trigger deployment
```

---

## Branch Strategy

```
main (production)
  │
  ├── develop (staging)
  │     │
  │     ├── feature/feature-name
  │     ├── fix/bug-name
  │     └── refactor/area-name
  │
  └── hotfix/critical-fix (from main)
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `hotfix/` - Critical production fixes
- `chore/` - Maintenance tasks

### Merge Strategy

- **Feature → Develop**: Squash merge
- **Develop → Main**: Merge commit
- **Hotfix → Main**: Merge commit (fast-tracked)
- **Hotfix → Develop**: Cherry-pick

---

## Monitoring CI/CD

### GitHub Actions Dashboard

View workflow runs at:
```
https://github.com/[org]/barkbase/actions
```

### Notifications

- **Slack**: Workflow failures posted to #dev-alerts
- **Email**: Critical failures to team leads

### Debugging Failed Builds

1. Check workflow run logs in GitHub Actions
2. Download artifacts for investigation
3. Re-run failed jobs with debug logging:
   ```yaml
   env:
     ACTIONS_STEP_DEBUG: true
   ```

---

## Performance Metrics

### Target CI Times

| Stage | Target | Alert Threshold |
|-------|--------|-----------------|
| Lint | < 1 min | 2 min |
| Test | < 3 min | 5 min |
| Build | < 2 min | 4 min |
| Deploy | < 5 min | 10 min |
| **Total** | **< 10 min** | **15 min** |

### Caching Strategy

```yaml
# Node modules caching
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json

# Build caching (Vite)
- uses: actions/cache@v3
  with:
    path: frontend/node_modules/.vite
    key: vite-${{ hashFiles('frontend/package-lock.json') }}
```
