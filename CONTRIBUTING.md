# Contributing

Issues and pull requests are welcome.

Before submitting a change:

1. Run `npm install`.
2. Run `npm run build`.
3. Run `npm run check-release`.
4. Test the plugin in a separate Obsidian vault.
5. Keep the plugin local-first: do not add telemetry or network behavior without clearly documenting why it is required.

The release artifact is `main.js`; it is generated from `src/main.ts`.
