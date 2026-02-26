# Resolving GitHub Push Permission Issues

This document describes the steps taken to resolve the `403 Permission Denied` error
that occurred when pushing changes to the `pie911/INVERT-EXTENSION` repository.

## Problem

- Git operations were authenticating as the wrong GitHub user (`yashvantdevops`).
- The correct account (`yashvantsolanki25`) was granted push permissions, but the
  local Git configuration and credential helper hadn’t been updated.
- Push attempts kept failing with `remote: Permission denied ... 403`.

## Key Observations

1. The repository remote (`origin`) was set to `https://github.com/pie911/...`.
2. Git configured the `gh` (GitHub CLI) credential helper, which was logged in as
   the wrong user.
3. Cached credentials from the Windows Credential Manager also referred to the old
   account.

## Resolution Steps

1. **Clear or update credentials**
   - Remove cached credentials via Windows Credential Manager or using the
     `git credential-manager erase` command.
   - Ensure the `git config` entries for `credential.helper` either pointed to
     `manager` or `gh`.

2. **Re-authenticate GitHub CLI (`gh`)
   - Run `gh auth logout` to clear the existing session.
   - Execute `gh auth login` and authenticate using the GitHub account that now
     has access. Choose SSH as the protocol and optionally generate/upload an
     SSH key during login.
   - Verify with `gh auth status` that the active account is correct.

3. **Switch to SSH remote (optional but recommended)**
   ```powershell
   git remote set-url origin git@github.com:pie911/INVERT-EXTENSION.git
   git remote -v
   git remote remove upstream  # if duplicate remote exists
   ```
   This avoids HTTPS credential caching issues entirely.

4. **Perform the push**
   ```powershell
   git push origin main
   ```
   The push should now succeed without a 403. If using HTTPS, specify the username
   in the URL to force a credential prompt:
   ```powershell
   git push https://<username>@github.com/pie911/INVERT-EXTENSION.git main
   ```

## Additional Notes

- The repository’s local Git config initially had `credential.https://github.com.helper` set
  to use `gh auth git-credential`, which is why `gh`’s login state mattered.
- After switching to SSH and authenticating the correct user, future pushes
  work seamlessly.
- If you ever need to resolve conflicts or merge updates, use the standard Git
  merge/rebase workflow described in the earlier logs.

## Summary

By clearing outdated credentials, logging `gh` in as the right user, and
(upgrade) switching the remote to SSH, the `403 Permission Denied` errors were
resolved and the local repository successfully pushed to the remote.

Keep this document for future reference when encountering similar GitHub
authentication issues.