# AU Roof Carpenter

Offline roof set-out for Australian carpenters — **gable ends**, **common rafter / birdsmouth**, **hip & valley**, **creepers**, and **L/T junctions**.

This is a **Capacitor + Vite + React + TypeScript SPA**. Web assets bundle into the native shells so every tool works **offline**. No login, no cloud database, no ads.

| | |
| --- | --- |
| Display name | AU Roof Carpenter |
| Subtitle | Metric set-out — rafters, hips, creepers |
| Package / app ID | `com.josh12891.roofsetout` (do not rename) |
| Seller / publisher | Australian Dynamics (Australia) |
| Support email | australiancomsnetwork@gmail.com |
| npm / repo folder | `roof-setout-au` (unchanged) |
| Privacy policy (Play + App Store Connect) | **https://josh12891.github.io/roof-setout-au/privacy.html** |
| IAP product id | `roof_setout_pro_unlock` |
| IAP price | **$39.99 AUD** one-time (placeholder — not a subscription) |

Public surfaces use **Australian Dynamics** and **australiancomsnetwork@gmail.com** only — no personal names or personal emails.

## Tools

1. **Gable ends** (free) — rise, ridge length, barge/rake on a rectangular gable.
2. **Common rafter** (free) — span, pitch (degrees or rise:run), overhang, birdsmouth seat / heel / remaining depth, plumb & level cuts.
3. **Hip set-out** (Pro) — equal-pitch plan run, hip pitch, slope length, backing and side cuts.
4. **Creeper schedule** (Pro) — common difference (hero), plate marks, cutting list and job-level material order.
5. **L / T junctions** (Pro) — equal hip/valley or unequal-pitch joins on an L or T plan.

Skillion is **not** in this build (not claimed, not gated).

Product maths live in `src/lib/roof` (geometry, junction, types, tests). UI in `src/components/roof`.

## Pricing (freemium split)

| | |
| --- | --- |
| Free forever | Gable ends, common rafter, birdsmouth |
| One free calculation each | Hip set-out, creeper schedule (common difference, cutting list, material order), L/T junctions |
| Paid unlock | Same **$39.99 AUD** one-time purchase unlocks all Pro tools |
| Product id | `roof_setout_pro_unlock` (non-consumable / managed product) |

Native Android and iOS builds use **[@capgo/native-purchases](https://github.com/Cap-go/capacitor-native-purchases)** (Play Billing + StoreKit 2). A successful purchase or restore caches `localStorage` key `roof-setout-au.unlock.v1`. Free-use counters use `roof-setout-au.free-uses.v1`.

**TestFlight only:** complimentary Pro unlock for screenshots (sandbox receipt, no embedded provision). We do **not** bake a Codemagic compile flag into the IPA. App Store and Play customers stay on freemium. Lauren (`lozzpearson@gmail.com`) and other internal TestFlight testers can capture Pro screenshots without purchase; production App Store builds are **not** unlocked this way.

Web/debug builds keep the **local unlock stub** (same flag, not billed).

## Requirements

- Node.js 20+
- Android Studio (Ladybug or newer) for Play builds
- Xcode 16+ on macOS for local App Store builds (iOS 15+), **or** Codemagic Mac mini M2 CI — [docs/ios-codemagic.md](docs/ios-codemagic.md)

## Scripts

```bash
npm install
npm run dev          # Vite SPA at http://localhost:5173
npm test             # geometry + junction + unlock + privacy-docs + CI wiring
npm run build        # sync docs/privacy.html, typecheck, production dist/
npm run cap:sync     # build web assets and copy into android/ + ios/
npm run cap:android  # sync then open Android Studio
npm run cap:ios      # sync then open Xcode (macOS)
npm run android:bundle   # cap sync + signed Play AAB (needs keystore.properties)
```

## Capacitor sync

```bash
npm install
npm run build
npx cap sync
npx cap open android   # or: npm run cap:android
npx cap open ios       # or: npm run cap:ios (macOS)
```

- **appId:** `com.josh12891.roofsetout` (locked — do not rename)
- **appName / CFBundleDisplayName:** `AU Roof Carpenter`
- **webDir:** `dist` (see `capacitor.config.json`)
- Platforms live in `android/` and `ios/` and are committed so store builds are reproducible.

Production always loads the bundled `dist` copy (no live reload in store binaries).

### Display-name rename checklist

If the display name changes again later:

1. Change `appName` in `capacitor.config.json` and the `<title>` / home heading copy.
2. Update `android/app/src/main/res/values/strings.xml` `app_name`.
3. Update iOS `CFBundleDisplayName` in `Info.plist`.
4. Keep **`com.josh12891.roofsetout`** unless you intentionally create a new store listing.
5. Re-run `npm run cap:sync`.

## Privacy policy URL (GitHub Pages)

```
https://josh12891.github.io/roof-setout-au/privacy.html
```

Source: `public/privacy.html` (copied to `docs/privacy.html` on `npm test` / `npm run build`). Enable Pages: **Settings → Pages → Deploy from branch → `main` / `/docs`**. That serves `docs/` as the site root, so `privacy.html` is at the URL above (and `docs/index.html` redirects to it).

## Codemagic connect (Play + ASC)

Workflows live in [`codemagic.yaml`](codemagic.yaml). Full iOS walkthrough: **[docs/ios-codemagic.md](docs/ios-codemagic.md)**.

### Connect the repo

1. Free account at [codemagic.io](https://codemagic.io) (GitHub login is fine).
2. **Add application** → GitHub → **`josh12891/roof-setout-au`**.
3. Scan **`codemagic.yaml`** on `main` (or this PR branch). Confirm:
   - **`ios-app-store`** — Capacitor iOS → signed IPA → TestFlight (starts on **push to `main`**)
   - **`android-play`** — Capacitor Android → signed AAB with Play Billing (manual start until the upload keystore is in Codemagic)

### ASC / TestFlight (`ios-app-store`)

| | |
| --- | --- |
| Bundle id | `com.josh12891.roofsetout` |
| ASC integration | Reuse **`tradies-toolbox-asc`** (same Apple team; App Manager key can sign any app under the account). Only create **`au-roof-carpenter-asc`** if you need a dedicated key — then rename `integrations.app_store_connect` in the yaml. |
| `APP_STORE_APPLE_ID` | Set after creating **AU Roof Carpenter** in App Store Connect → App Information |
| `PUBLISH_TESTFLIGHT` | Yaml default `true`; override as an Application variable to skip upload |
| Secrets | Codemagic UI only — never commit `.p8` / `.p12` / passwords |

Signed App Store IPA and TestFlight details: [docs/ios-codemagic.md](docs/ios-codemagic.md). Free 500 M2 min/month, then about $0.095/min.

### Play AAB (`android-play`)

| | |
| --- | --- |
| Application id | `com.josh12891.roofsetout` |
| Artifact | Signed AAB at `android/app/build/outputs/bundle/release/app-release.aab` |
| Billing | Manifest declares `com.android.vending.BILLING` (required before Console can create the IAP) |
| Signing | Codemagic injects `CM_KEYSTORE_PATH` / `CM_KEYSTORE_PASSWORD` / `CM_KEY_ALIAS` / `CM_KEY_PASSWORD` |

**Josh / Codemagic must supply the existing Play upload keystore** — do **not** invent a second upload key after Play accepts an AAB:

1. Preferred: Codemagic → **Team settings** → **Code signing identities** → **Android keystores** → upload the `.jks` as reference name exactly **`roof-setout-upload`** (matches `android_signing` in the yaml).
2. Alternative: Application/Team group **`keystore_credentials`** with base64 **`CM_KEYSTORE`** plus `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD` (uncomment `groups` in the yaml).

Local rebuilds use gitignored `android/keystore.properties` + `android/upload-keystore.jks` (`npm run android:bundle`). `npm run android:keystore` creates a **new** upload key only once, before the first Play upload.

Gradle release signing reads Codemagic `CM_*` env vars when present, otherwise `keystore.properties`.

## Play / ASC checklist

- [ ] GitHub Pages: **Settings → Pages → `main` / `/docs`** → confirm https://josh12891.github.io/roof-setout-au/privacy.html
- [ ] Play Console app with application id `com.josh12891.roofsetout` (Australian Dynamics)
- [ ] Upload keystore in password manager + Codemagic (`roof-setout-upload` or `CM_KEYSTORE` group) — **same** key for every update
- [ ] Codemagic `android-play` produces a signed AAB that declares `com.android.vending.BILLING`
- [ ] Create Play IAP `roof_setout_pro_unlock` at **AUD 39.99** (after first Billing AAB is uploaded)
- [ ] App Store Connect app: display name **AU Roof Carpenter**, subtitle **Metric set-out — rafters, hips, creepers**, support australiancomsnetwork@gmail.com
- [ ] StoreKit product `roof_setout_pro_unlock` at **$39.99 AUD** (non-consumable)
- [ ] Paste privacy URL into both stores
- [ ] Codemagic `ios-app-store` + reuse `tradies-toolbox-asc` → TestFlight IPA
- [ ] Set `APP_STORE_APPLE_ID` once the ASC app record exists
- [ ] Lauren (`lozzpearson@gmail.com`) on TestFlight for Pro screenshots (complimentary unlock — production stays freemium)
- [ ] Generate final icon/splash (`npm run assets` once brand mark is final)

## Roof Features checklist (Josh + Roof Features)

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Creeper-first language (prefer “creeper” over “jack” in UI) | **Done** |
| 2 | Aggregated material order rollup (job-level, not only per-row stock) | **Done** (creeper schedule) |
| 3 | Common difference / incremental decrease as hero Pro result | **Done** (creeper schedule) |
| 4 | Freemium: free gable/common/birdsmouth; Pro hip set-out, creeper schedule, common difference, cutting list + material order, L/T | **Done** |
| 5 | Branding AU Roof Carpenter + subtitle lean; no “Australian Carpentry”; bundle `com.josh12891.roofsetout` | **Done** |
| 6 | Do not claim skillion until shipped | **Done** (not in UI / unlock) |
| 7 | Codemagic `ios-app-store` + `android-play` | **Done** (this PR — secrets stay in Codemagic UI) |

## Prototype note

The Grok web prototype (`roofing-grok-build/`) was intended as `uploads/*.tgz`. That archive was not present in the agent workspace, so geometry was implemented fresh under `src/lib/roof` to match the freemium product scope (gable / common / hip / creeper / L-T junctions). Drop the tarball into `uploads/` later if you want a diff against the original Grok sources.

## Pattern

Mirrors [Tradies Toolbox](https://github.com/josh12891/chippys-toolbox): Vite web UI in Capacitor iOS+Android, offline-first, freemium IAP via Capgo native purchases, Codemagic Mac mini M2 for signed IPA / AAB.

```
docs/            GitHub Pages (privacy.html + index) + ios-codemagic.md
codemagic.yaml   ios-app-store (TestFlight via tradies-toolbox-asc) + android-play (CM_KEYSTORE)
```
