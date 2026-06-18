# Releasing

Publishing to npm (`@devdatalab/ddl-charts`) is automated via GitHub Actions.
A publish runs only when a **GitHub Release** is published — it runs the test
suite and then `npm publish`. You never run `npm publish` by hand.

## One-time setup (org owner)

1. Create an npm **automation** access token:
   - npmjs.com → your avatar → **Access Tokens** → **Generate New Token** →
     **Granular Access Token** (or classic **Automation** token).
   - Scope it to the `@devdatalab` org / `@devdatalab/ddl-charts` package with
     **read and write** permission. Automation tokens bypass 2FA, which CI needs.
2. Add it to the repo:
   - GitHub → repo **Settings** → **Secrets and variables** → **Actions** →
     **New repository secret**.
   - Name: `NPM_TOKEN`. Value: the token from step 1.

That's it. Both are required before the first automated release.

## Cutting a release

From an up-to-date `master`:

```bash
# pick one — bumps version in package.json, commits, and creates a git tag
npm version patch   # 0.1.0 -> 0.1.1  (bug fixes)
npm version minor   # 0.1.0 -> 0.2.0  (new features, backwards compatible)
npm version major   # 0.1.0 -> 1.0.0  (breaking changes)

git push --follow-tags
```

Then create the GitHub Release for the tag you just pushed:

```bash
# requires the GitHub CLI (`gh`)
gh release create "v$(node -p "require('./package.json').version")" --generate-notes
```

…or do it in the GitHub UI: **Releases** → **Draft a new release** → choose the
tag → **Publish release**.

Publishing the release triggers `.github/workflows/publish.yml`, which:

1. Verifies the release tag matches `package.json` (guards against mismatched bumps).
2. Runs `npm run test:run`.
3. Publishes to npm with provenance.

Watch it under the repo's **Actions** tab. If tests fail, nothing is published.
