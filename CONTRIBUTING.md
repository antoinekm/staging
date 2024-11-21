# Contributing to Staging

Thank you for your interest in contributing to Staging! We're excited to have you help make our password protection middleware even better.

## Development Setup

### Prerequisites

* Node.js 16.x or higher
* pnpm 9.x or higher (we use pnpm workspaces)
* Git

### Getting Started

1. Fork and clone the repository
   ```bash
   git clone https://github.com/YourUsername/staging.git
   cd staging
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Start development mode (uses tsup watch mode)
   ```bash
   pnpm dev
   ```

### Project Structure

```
staging/
├── examples/          # Example implementations
│   ├── express/       # Express.js example
│   ├── next/         # Next.js example
│   └── nuxt/         # Nuxt.js example
├── packages/
│   ├── express/      # Express.js integration
│   ├── next/        # Next.js integration
│   ├── nuxt/        # Nuxt.js integration
│   └── staging/     # Core package
└── package.json
```

## Development Workflow

1. Create a new branch for your feature/fix
   ```bash
   git checkout -b yourusername/your-feature-name
   ```

2. Make your changes
   * Follow the existing code style
   * Add/update tests as needed
   * Update documentation if required

3. Test your changes
   ```bash
   # Start development mode
   pnpm dev

   # Run tests
   pnpm test

   # Lint code
   pnpm lint
   ```

4. Commit your changes using conventional commits
   ```bash
   git commit -m "feat: add new feature"
   ```

### Commit Convention

We use [onruntime studio conventions](https://github.com/onruntime) with gitmoji for our commit messages. Your commit messages should be lowercase and include an appropriate emoji prefix.

Examples:

```bash
git commit -m "🎨 improve login page styling"
git commit -m "✨ add new authentication feature"
git commit -m "🐛 fix password validation issue"
git commit -m "📝 update readme with demo links"
```

Common emoji prefixes:

* ✨ `:sparkles:` - New features
* 🐛 `:bug:` - Bug fixes
* 📝 `:memo:` - Documentation updates
* 🎨 `:art:` - Code style/structure improvements
* ♻️ `:recycle:` - Code refactoring
* ⚡️ `:zap:` - Performance improvements
* ✅ `:white_check_mark:` - Tests
* ⬆️ `:arrow_up:` - Dependencies updates
* 🔧 `:wrench:` - Configuration changes
* 🚀 `:rocket:` - Deployments
* 🔒 `:lock:` - Security improvements

### Creating a Pull Request

1. Push your branch to your fork
   ```bash
   git push origin yourusername/your-feature-name
   ```

2. Go to the [staging repository](https://github.com/AntoineKM/staging) and create a new Pull Request

3. Fill in the pull request template with:
   * Clear description of changes
   * Any breaking changes
   * Related issues
   * Screenshots (if applicable)

### Running Examples

To test your changes with the example projects:

```bash
# Run Express example
cd examples/express
pnpm dev

# Run Next.js example
cd examples/next
pnpm dev

# Run Nuxt.js example
cd examples/nuxt
pnpm dev
```

## Package Development

### Core Package

When working on the core `staging` package:

1. Make changes in `packages/staging/src`
2. Start development mode:
   ```bash
   cd packages/staging
   pnpm dev
   ```

### Framework Integrations

When working on framework-specific packages:

1. Navigate to the package directory:
   ```bash
   cd packages/[express|next|nuxt]
   ```

2. Make your changes

3. Start development mode:
   ```bash
   pnpm dev
   ```

4. Test with the corresponding example:
   ```bash
   cd ../../examples/[express|next|nuxt]
   pnpm dev
   ```

## Release Process

We use [Changesets](https://github.com/changesets/changesets) to manage versions and changelogs.

1. Create a changeset:
   ```bash
   pnpm changeset
   ```

2. Follow the prompts to describe your changes

3. Commit the changeset file:
   ```bash
   git add .changeset/*.md
   git commit -m "📝 add changeset"
   ```

The release workflow will automatically:

1. Update versions
2. Generate changelogs
3. Create a release PR
4. Publish to npm when merged

## Questions?

If you have any questions, feel free to:

* Open an issue
* Start a discussion
* Reach out to [@AntoineKM](https://github.com/AntoineKM)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
