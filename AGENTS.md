# Block Editor

Vortechron's page builder package: the full-screen builder behind "Bina" in every client site we promote from a
demo (`~/Projects/vortechron-demos/docs/agents/promote-demo.md`), through `vortechron/filament-cms`
(`~/Projects/filament-cms`). React builder in `builder/`, PHP content layer in `src/`. What it does and the
development commands: `README.md`. The design and every deviation from it: `docs/v2-plan.md`; the PHP side:
`docs/php.md`.

## Who uses it

- `vortechron/adamshop` (ROC - Adam Shop, `https://adamshopmy.com`, Cloud site 40, `~/Projects/adamshop`), through
  `vortechron/filament-cms`.
- Clients install it from GitHub tags (not Packagist), so a change reaches a client only through a release.

## Release a change

1. `npm run build` and commit `resources/dist`; clients get the built files, never the sources. On a merge conflict
   in `resources/dist`, rebuild instead of merging by hand.
2. `npm test`, `npm run typecheck`, `php84 vendor/bin/phpunit` and `php84 vendor/bin/pint <changed files>` pass.
3. Commit, tag `vX.Y.Z`, push `main` and the tag. Move the README install line when the minor version moves.
4. In each client: `composer require vortechron/filament-block-editor:^X.Y` with no `-W` (it would also pull new
   Laravel and Filament versions), `php artisan filament:assets`, commit the published files, run its tests, push.
   A push to the client's `main` deploys it; the page CSS link then shows the new version (`page.css?v=X.Y.Z`).

## Rules

- The builder speaks the app's language (`builder/src/lang/ms.ts` for Malay, English otherwise); the page speaks
  `SITE_LOCALE` (`Rendering\ContentLocale`). Our clients run an English panel (`APP_LOCALE=en`) and a Malay site
  (`SITE_LOCALE=ms`). Words drawn on the page follow the site; notes for the builder use `ContentLocale::panel()`.
- Local PHP is `php84`. Use `/opt/homebrew/bin/composer`; the Herd composer path has a space in it.
- With Node 26, run the JS suite as `NODE_OPTIONS=--no-experimental-webstorage npm test`. Node's built-in web storage otherwise overrides jsdom's storage and breaks the existing layout tests.
