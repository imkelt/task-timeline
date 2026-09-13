# Publishing Task Timeline

This repository is structured for submission to the Obsidian Community directory.

## Before the first submission

1. Confirm that `Task Timeline` and `task-timeline` are still unique in the Community directory.
2. Confirm the public author name in `manifest.json`, `package.json`, and `LICENSE`.
3. Test the release in a clean vault on the current stable Obsidian build.
4. Run:

```bash
npm install
npm run build
npm run check-release
npm run release:assets
```

## Create the initial GitHub release

The initial public version is `1.0.0`.

Create a GitHub release whose tag is exactly:

```text
1.0.0
```

The tag must match `manifest.json`.

Upload these files from the generated `release/1.0.0/` folder as release assets:

```text
main.js
manifest.json
styles.css
```

Do not upload only the source archive; Obsidian installs the binary release assets above.

## Submit to the Community directory

1. Sign in at `https://community.obsidian.md`.
2. Connect your GitHub account.
3. Add a plugin and provide the public GitHub repository URL.
4. Resolve any automated review errors or warnings.
5. Publish the listing after the review passes.

Only the initial version needs to be submitted through the directory. Later versions are delivered from GitHub Releases.

## Updating later

1. Update `minAppVersion` if necessary.
2. Run `npm version patch`, `npm version minor`, or `npm version major`.
3. Build and test again.
4. Create a GitHub release whose tag exactly matches the new manifest version.
5. Upload `main.js`, `manifest.json`, and `styles.css`.

The `version` npm script updates `manifest.json` and `versions.json`.
