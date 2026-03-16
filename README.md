# Duel Log App - Local (Electron Edition)

[日本語](README.ja.md) | English

A local (Electron) version of the Duel Log App. A standalone application based on the original web application, with login and sharing features removed.

## Features

- Fully offline with local database (SQLite)
- No authentication required - ready to use immediately
- Duel record management
- Deck management
- Statistics display
- Light/Dark theme toggle

## Removed Features

- User authentication (login/logout)
- Account registration
- Password reset
- Statistics sharing link

## Tech Stack

### Frontend
- Vue 3 (Composition API)
- TypeScript
- Vuetify 3
- Pinia (state management)
- Vue Router 4
- ApexCharts

### Backend / Database
- Electron
- better-sqlite3 (SQLite)

### Build Tools
- Vite
- electron-builder

## Setup

### Install Dependencies

```bash
npm install
```

### Run in Development Mode

```bash
npm run electron:dev
```

### Build

```bash
npm run electron:build
```

## Project Structure

```
duel-log-app-local/
├── config/                # Configuration files
│   ├── .eslintrc.cjs      # ESLint config
│   ├── .prettierrc.json   # Prettier config
│   ├── tsconfig.json      # Base TypeScript config
│   ├── tsconfig.main.json # Main process TypeScript config
│   ├── tsconfig.node.json # Node TypeScript config
│   ├── tsconfig.preload.json # Preload TypeScript config
│   └── vite.config.ts     # Vite config
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Main process entry point
│   │   └── database.ts    # SQLite database logic
│   ├── preload/           # Electron preload scripts
│   │   └── index.ts       # IPC exposed API
│   └── renderer/          # Vue frontend
│       ├── assets/        # Static assets
│       ├── components/    # Vue components
│       ├── plugins/       # Vue plugins (Vuetify, etc.)
│       ├── router/        # Vue Router config
│       ├── services/      # API services
│       ├── stores/        # Pinia state management
│       ├── types/         # TypeScript type definitions
│       ├── utils/         # Utility functions
│       ├── views/         # Page views
│       ├── App.vue        # Root component
│       └── main.ts        # Renderer process entry point
├── public/                # Public static files
├── dist/                  # Build output (renderer process)
├── dist-electron/         # Build output (Electron process)
├── electron-builder/      # Electron Builder config
├── index.html             # HTML entry point
├── package.json           # Project dependencies
└── README.md              # This file
```

## Database

Application data is stored at:
- Windows: `%APPDATA%/duel-log-app-local/duel-log.db`
- macOS: `~/Library/Application Support/duel-log-app-local/duel-log.db`
- Linux: `~/.config/duel-log-app-local/duel-log.db`

## Versioning and Releases

### Changing the Version Number

Update the version using npm commands (recommended):

```bash
# Patch version bump (1.0.0 -> 1.0.1) - Bug fixes
npm version patch

# Minor version bump (1.0.0 -> 1.1.0) - New features
npm version minor

# Major version bump (1.0.0 -> 2.0.0) - Breaking changes
npm version major

# Specify a specific version
npm version 1.5.0
```

### Release Workflow

1. **Version bump** (automatically creates commit & tag)
   ```bash
   npm version <new-version> -m "Release v%s: release notes"
   ```

2. **Regenerate icons** (if icons were changed)
   ```bash
   node generate-icons.js
   ```

3. **Build**
   ```bash
   npm run electron:build
   ```

4. **Push to GitHub**
   ```bash
   git push && git push --tags
   ```

Build artifacts are generated in the `release/` directory:
- `Duel Log App Setup <version>.exe` - Installer version
- `Duel Log App <version>.exe` - Portable version

## License

This project is licensed under the [MIT License](LICENSE).
