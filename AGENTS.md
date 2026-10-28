# Global Engineering & Git Workflow Rules

## 1. Git Branching & Merge Discipline (No Direct Push to `main`)
- **NEVER commit or push directly to the `main` (or `master`) branch** for any new feature, bugfix, or version update (except the initial repository bootstrap commit).
- **Mandatory Workflow for All Changes:**
  1. Create a dedicated branch from `main` before making changes:
     - `git checkout -b feat/<feature-name>`
     - `git checkout -b fix/<bug-name>`
     - `git checkout -b chore/<task-name>`
     - `git checkout -b release/v<version>`
  2. Implement changes and run automated tests (`npm test`) on the feature branch.
  3. Push the feature branch (`git push -u origin <branch-name>`) and either open a Pull Request or merge into `main` using `git merge --no-ff <branch-name>` only after verification passes.

## 2. Docker Builds on macOS External Volumes (`/Volumes/...`)
- On macOS external drives (exFAT/FAT32), macOS creates AppleDouble `._*` metadata files that cause Docker BuildKit to fail with `failed to xattr ... operation not permitted`.
- Always run `dot_clean -m . 2>/dev/null || true; find . -name "._*" -delete 2>/dev/null || true` before executing `docker build` or `docker compose up --build`.

## 3. Open-Source GitHub Repositories & AI Skills
- When publishing a project to GitHub, always provide a comprehensive bilingual `README.md` (**🇺🇸 English** and **🇻🇳 Tiếng Việt**) and bundle any relevant AI skills inside `skills/<skill-name>/` with a one-command installer (`npm run install-skill`).
