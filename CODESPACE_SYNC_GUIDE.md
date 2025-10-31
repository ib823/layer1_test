# Codespace Sync Guide

This guide ensures your GitHub Codespace is synced with the latest changes made by Claude Code.

## Quick Sync (Every Time You Open Codespace)

```bash
# Navigate to project directory (if not already there)
cd /workspace/layer1_test  # or wherever your project is mounted

# Fetch all remote changes
git fetch origin

# Pull the latest changes from the development branch
git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57

# Verify you have the latest commit
git log --oneline -5
```

**Expected Output**: You should see commit `aa6a2f1` as the most recent:
```
aa6a2f1 feat: complete 100% - monitoring, backups, and localhost testing
f837452 feat: complete production readiness - 95% deployment ready
44626c5 feat: comprehensive module testing, CI/CD fixes, and production readiness
...
```

## If You're Not on the Right Branch

```bash
# Check current branch
git branch

# If not on the Claude development branch, switch to it
git checkout claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57

# Pull latest changes
git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57
```

## If You Have Local Changes (Conflicts)

If you've made changes in your codespace and git won't let you pull:

### Option 1: Stash Your Changes (Recommended)
```bash
# Save your local changes temporarily
git stash

# Pull the latest changes
git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57

# Restore your local changes on top
git stash pop
```

### Option 2: Create a New Branch for Your Work
```bash
# Create and switch to a new branch with your changes
git checkout -b my-local-work

# Switch back to the Claude branch
git checkout claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57

# Pull latest changes (this should work now)
git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57
```

### Option 3: Hard Reset (⚠️ WARNING: Discards Local Changes)
```bash
# ⚠️ THIS WILL DELETE ALL YOUR LOCAL CHANGES
git reset --hard origin/claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57
```

## Verify Sync is Complete

After pulling, verify these key files exist:

```bash
# Check that all localhost testing files are present
ls -lh scripts/setup-localhost.sh
ls -lh scripts/backup-database.sh
ls -lh LOCALHOST_TESTING_GUIDE.md
ls -lh FINAL_COMPLETION_SUMMARY.md

# Verify scripts are executable
ls -l scripts/*.sh | grep "^-rwxr"
```

**Expected Output**: All files should exist and scripts should have `x` permission.

## After Sync: Install Dependencies

Once synced, ensure all dependencies are up to date:

```bash
# Install/update dependencies
pnpm install

# Rebuild if needed (optional, but recommended after major changes)
pnpm build
```

## Verify Your Environment

```bash
# Check if .env file exists
ls -lh .env

# If not, run the setup script
./scripts/setup-localhost.sh
```

## One-Command Full Sync (Recommended)

Create this alias in your codespace for easy syncing:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias sync-project='git fetch origin && git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57 && pnpm install'

# Then just run:
sync-project
```

## Common Issues

### Issue 1: "Your local changes would be overwritten"
**Solution**: Use `git stash` before pulling (see Option 1 above)

### Issue 2: "Branch not found"
**Solution**:
```bash
git fetch origin
git checkout -b claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57 origin/claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57
```

### Issue 3: "Permission denied" for scripts
**Solution**:
```bash
chmod +x scripts/*.sh
```

### Issue 4: "Failed to connect to github.com"
**Solution**: Check your codespace's network connection and GitHub authentication

## Automation Option

Add this to your codespace's `.devcontainer/devcontainer.json` to auto-sync on start:

```json
{
  "postStartCommand": "git fetch origin && git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57 || true"
}
```

## Quick Health Check After Sync

```bash
# Verify the project is working
pnpm typecheck

# Run a quick test
pnpm test -- --testPathPattern=health
```

## Summary

**Every time you open your codespace:**

1. `git fetch origin`
2. `git pull origin claude/review-latest-codebase-011CUeemwHRTpyHLXncU9j57`
3. `pnpm install` (if dependencies changed)
4. Verify with `git log --oneline -5`

That's it! You'll always have the latest code.

---

## Pro Tip: Set Up Git Pull Rebase

To avoid merge commits when syncing:

```bash
git config pull.rebase true
```

Now `git pull` will cleanly apply remote changes on top of any local work.
