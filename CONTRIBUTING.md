# Contributing to EkagraFocus

Thank you for your interest in contributing to EkagraFocus! We welcome contributions from everyone. This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're committed to providing a welcoming and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs
- Check if the bug has already been reported in [Issues](https://github.com/yourusername/focus-agent/issues)
- If not, create a new issue with:
  - Clear description of the problem
  - Steps to reproduce
  - Expected behavior vs actual behavior
  - Screenshots if applicable
  - Your environment (OS, Node version, etc.)

### Suggesting Features
- Use [Issues](https://github.com/yourusername/focus-agent/issues) to suggest new features
- Describe the feature and its use case
- Explain why it would be valuable to the project

### Submitting Pull Requests

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/focus-agent.git
   cd focus-agent
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or for bug fixes:
   git checkout -b fix/bug-description
   ```

3. **Setup Development Environment**
   ```bash
   npm install
   ```

4. **Make Your Changes**
   - Follow the existing code style
   - Keep commits atomic and well-described
   - Add comments for complex logic
   - Update tests if applicable

5. **Build and Test**
   ```bash
   npm run lint        # Check code style
   npm start          # Run in development mode
   ```

6. **Commit and Push**
   ```bash
   git add .
   git commit -m "fix: brief description of changes"
   git push origin your-branch-name
   ```

   > Commits are linted automatically via Husky + commitlint. Invalid messages are rejected. See [Commit Message Format](#commit-message-format) below.

7. **Create Pull Request**
   - Provide a clear title and description
   - Link any related issues
   - Wait for review and feedback

## Development Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Git

### Installation
```bash
npm install
```

### Running Development Server
```bash
npm start
```

### Building for Production
```bash
npm run make
```

## Commit Message Format

This project enforces [Conventional Commits](https://www.conventionalcommits.org/). Husky runs `commitlint` on every commit — invalid messages are rejected before they land.

### Structure

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- **type** — required, lowercase
- **scope** — optional, lowercase, describes the affected area
- **subject** — required, lowercase, no trailing period, max 100 chars total

### Allowed Types

| Type       | When to use                                      |
|------------|--------------------------------------------------|
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation only                               |
| `style`    | Formatting, missing semicolons (no logic change) |
| `refactor` | Code change that is neither feat nor fix         |
| `perf`     | Performance improvement                          |
| `test`     | Adding or updating tests                         |
| `build`    | Build system or external dependency changes      |
| `ci`       | CI/CD configuration                              |
| `chore`    | Maintenance tasks (e.g. husky, lint config)      |
| `revert`   | Reverts a previous commit                        |

### Good Examples

```
feat(timer): add pomodoro break notification
fix(auth): prevent session token from expiring early
docs: add commit message guidelines to CONTRIBUTING
refactor(notes): extract markdown renderer to utility
chore: update husky to v9
```

### Bad Examples

```
# Missing type
Updated the timer component

# Type not lowercase
Fix: resolve crash on startup

# Subject starts with capital letter
feat: Add dark mode toggle

# Subject ends with period
fix(auth): handle null user object.

# Vague subject
fix: stuff

# Type not in allowed list
update: refresh dependencies
```

### Breaking Changes

Add `!` after the type/scope in the footer:

```
feat(api)!: remove deprecated /v1/sessions endpoint
```

---

## Code Style

- Use TypeScript for type safety
- Follow ESLint configuration in `.eslintrc.json`
- Use Prettier formatting (if configured)
- Write meaningful variable and function names
- Add JSDoc comments for public APIs

## Project Structure

```
src/
├── main/          # Main process (Electron)
├── renderer/      # Renderer process (React UI)
├── components/    # React components
├── services/      # Business logic
├── types/         # TypeScript definitions
└── utils/         # Utility functions
```

## Questions?

- Open an issue for questions or discussions
- Check existing documentation in README.md
- Review the codebase for similar implementations

## Recognition

Contributors will be recognized in:
- Git commit history
- Project README (with permission)
- Release notes for significant contributions

Thank you for helping make EkagraFocus better!
