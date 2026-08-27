# 🤝 Contributing to X-SENTINEL

Thank you for your interest in contributing to **X-SENTINEL**! We welcome contributions from developers, researchers, and AI agent builders.

Please take a moment to read this guide to ensure a smooth collaboration.

---

## 📜 Code of Conduct & Ethical Automation

X-SENTINEL is created for ethical social media growth research, content curation, and autonomous management. 

When contributing:
- Do **not** implement malicious spamming, coordinated harassment, or abusive exploitation routines.
- Maintain humanized action intervals and stealth safety mechanisms to preserve account reputation.
- Never hardcode or commit API keys, personal session cookies, proxy credentials, or live Twitter tokens into the codebase.

---

## 🛠️ Getting Started with Development

### 1. Fork & Clone
```bash
git clone https://github.com/MHendriF/x-sentinel.git
cd x-sentinel
```

### 2. Install Dependencies
```bash
# Install root & backend dependencies
bun install

# Install client dependencies
bun install --cwd client
```

### 3. Launch Development Server
```bash
bun run dev
```
- Frontend UI: `http://localhost:5173` (proxied to API on port 3000)
- Backend Server: `http://localhost:3000`

---

## 🌿 Git Branching Workflow

1. Create a feature or bugfix branch off `main`:
   - Features: `git checkout -b feature/my-new-feature`
   - Bugfixes: `git checkout -b fix/issue-description`
   - Documentation: `git checkout -b docs/update-reference`
2. Make your modifications following our code standards.
3. Test and build locally:
   ```bash
   bun run --cwd client build
   ```
4. Commit your changes using **Conventional Commits** format.
5. Push to your fork and submit a Pull Request against the `main` branch.

---

## 📝 Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. Structure your commit messages as follows:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

### Common Types:
- `feat`: A new feature (e.g., `feat: add Discord webhook embed notifications`)
- `fix`: A bug fix (e.g., `fix: resolve AI provider null state on cold mount`)
- `docs`: Documentation changes (e.g., `docs: add CHANGELOG.md and CONTRIBUTING.md`)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `style`: Changes that do not affect code logic (formatting, semicolons)
- `perf`: Code change that improves performance
- `test`: Adding or correcting tests

---

## 🛡️ Coding Guidelines & Rules

### 1. Atomic Database Updates
Never use raw `fs.writeFileSync` on files in `data/`. Always use `db.save(type)` or `db.writeFileAtomic(...)` to prevent corrupted JSON files during sudden shutdowns.

### 2. Single Centralized Store
All frontend cross-component states belong in `client/src/store/useStore.ts` (Zustand). Do not introduce isolated stores or global variable pollutions.

### 3. Strict Single-Line Post Output
AI tweet generators must always collapse multiple newlines into single spaces for authentic Twitter one-liner cadence.

### 4. UI Date & Time Standards
Render timestamps using Indonesian numeric date (`DD/MM/YYYY`) on the primary line and time (`HH:mm:ss`) on the secondary line.

### 5. Build Verification
Before opening a PR, ensure the frontend builds cleanly without TypeScript or Vite errors:
```bash
bun run --cwd client build
```

---

## 📬 Reporting Issues & Requesting Features

When opening an issue, please provide:
1. **Clear description**: What happened vs what was expected.
2. **Environment details**: Operating System, Bun/Node version, Chromium version.
3. **Reproduction steps**: Minimal steps to reproduce the issue.
4. **Log excerpts**: Relevant lines from the Terminal Console or `server.log` (make sure to sanitize private cookies or proxy IPs!).

Thank you for helping make X-SENTINEL the premier autonomous cockpit for X! 🚀
