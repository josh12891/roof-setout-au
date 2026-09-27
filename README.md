# AU Roof Carpenter

Offline roof set-out for Australian carpenters. The first screen is a **Flat roof** / **Pitched roof** choice. Flat is one plane (level or pitched) with rafter length calculated from the plan. Pitched opens one **Roof Setout** screen: length, width, pitch, hip or gable ends, rafters, hips, valleys, creepers and L/T junctions together.

This is a **Capacitor + Vite + React + TypeScript SPA**. Web assets bundle into the native shells so set-out works **offline**. No login, no cloud database, no ads.

| | |
| --- | --- |
| Display name | AU Roof Carpenter |
| Subtitle | Metric set-out — rafters, hips, creepers |
| Package / app ID | `com.josh12891.roofsetout` (do not rename) |
| Seller / publisher | Australian Dynamics (Australia) |
| Support email | australiancomsnetwork@gmail.com |
| npm / repo folder | `roof-setout-au` (unchanged) |
| Privacy policy (Play + App Store Connect) | **https://josh12891.github.io/roof-setout-au/privacy.html** |
| IAP product ids | Lifetime `roof_setout_pro_unlock` · Annual `roof_setout_pro_annual` |
| IAP prices | **$39.99 AUD** lifetime, or **$14.99 AUD/year** (no monthly). Either unlocks the same Pro set. |
| Store version | Marketing **1.0.9**. Android `versionCode` **10**. iOS `CFBundleShortVersionString` **1.0.9**, `CFBundleVersion` **13** (Codemagic still replaces the iOS build number from the latest TestFlight build when App Store Connect credentials are present). |

Public surfaces use **Australian Dynamics** and **australiancomsnetwork@gmail.com** only — no personal names or personal emails.

## Set-out

The first screen asks **Flat roof** or **Pitched roof**. It is not the old five-tool menu (gable, common, hip, creeper, L/T as separate cards).

| Choice | What you get |
| --- | --- |
| Flat roof | One plane that can carry pitch: building length and width, pitch, 450/600 centres, eaves each side, member size. Rafter length is calculated from the plan (not typed). 2D plan and isometric. A span-table note stays on the screen — the span is the plan width; the app does not size the timber. |
| Pitched roof | The one Roof Setout workspace (inputs, roof diagram, results): hips, valleys, creepers, broken-hip jacks, L/T junctions, cutting list, freemium overlay. Cutting list stays collapsed behind a button beside Isometric / Hip set-out. The hip jack rafter table lives in Hip set-out. |

| On the pitched screen | |
| --- | --- |
| Free | Pitched gable only: common rafter, birdsmouth, ridge / gable lengths, common plumb and seat, plan and section. Flat roof numbers stay free, including the one-plane sketch. |
| Pro | Isometric, cutting list, hip / valley / creeper set-out, L/T junctions (broken hip included). No free preview. |

Hip, L-shape and T-shape controls stay on the pitched screen and open the unlock paywall. They do not change the free gable numbers. The flat path is not behind that overlay.

Pitched geometry is the Grok calculator in `src/lib/roof`. That screen is `src/pages/RoofSetoutPage.tsx` plus `src/components/roof`. Flat lengths are `src/lib/roof/flat.ts` on `src/pages/FlatRoofPage.tsx`. The choice is `src/pages/RoofChoicePage.tsx`.

## Pricing (freemium split)

| | |
| --- | --- |
| Free | Flat roof numbers, and pitched gable commons / birdsmouth / pitch |
| Pro | Isometric, cutting list, hip / valley / creeper / L·T — locked until purchase |
| Annual | **$14.99 AUD/year** — `roof_setout_pro_annual` (auto-renewable; Play base plan id `annual`) |
| Lifetime | **$39.99 AUD** — `roof_setout_pro_unlock` (non-consumable / managed product) |

Either purchase unlocks the same Pro set. Restore queries both the in-app product and the subscription.

Native Android and iOS builds use **[@capgo/native-purchases](https://github.com/Cap-go/capacitor-native-purchases)** (Play Billing + StoreKit 2). A successful purchase or restore caches `localStorage` key `roof-setout-au.unlock.v1`.

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
| ASC integration | **`tradies-toolbox-asc`** (Key ID `RKW2G7LD5J`; must match Team integrations Developer Portal key name). Same Apple team; App Manager key can sign any app under the account. Only create **`au-roof-carpenter-asc`** if you need a dedicated key — then rename `integrations.app_store_connect` in the yaml. |
| `APP_STORE_APPLE_ID` | `6814817371` (**AU Roof Carpenter**, bundle `com.josh12891.roofsetout`) |
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
- [ ] Create Play IAP `roof_setout_pro_unlock` at **AUD 39.99** (lifetime, after first Billing AAB is uploaded)
- [ ] Create Play subscription `roof_setout_pro_annual` with base plan id **`annual`** at **AUD 14.99 / year** (no monthly)
- [x] App Store Connect app: display name **AU Roof Carpenter**, subtitle **Metric set-out — rafters, hips, creepers**, support australiancomsnetwork@gmail.com (Apple ID `6814817371`, bundle `com.josh12891.roofsetout`)
- [ ] StoreKit product `roof_setout_pro_unlock` at **$39.99 AUD** (non-consumable)
- [ ] StoreKit auto-renewable `roof_setout_pro_annual` at **$14.99 AUD / year** (no monthly)
- [ ] Paste privacy URL into both stores
- [ ] Codemagic `ios-app-store` + `tradies-toolbox-asc` → TestFlight IPA
- [x] `APP_STORE_APPLE_ID` set to `6814817371`
- [ ] Lauren (`lozzpearson@gmail.com`) on TestFlight for Pro screenshots (complimentary unlock — production stays freemium)
- [ ] Generate final icon/splash (`npm run assets` once brand mark is final)

## Roof Features checklist (Josh + Roof Features)

| # | Requirement | Status |
| --- | --- | --- |
| 1 | Creeper-first language (prefer “creeper” over “jack” in UI) | **Done** |
| 2 | Aggregated material order rollup (job-level, not only per-row stock) | **Done** (creeper schedule) |
| 3 | Common difference / incremental decrease as hero Pro result | **Done** (creeper schedule) |
| 4 | Locked freemium: free flat + pitched gable numbers; Pro isometric, cutting list, hip / valley / creeper / L·T. Annual `roof_setout_pro_annual` or lifetime `roof_setout_pro_unlock`. | **Done** |
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
