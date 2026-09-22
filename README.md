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
3. **Hip / valley** (Pro) — equal-pitch plan run, hip pitch, slope length, backing and side cuts.
4. **Creepers** (Pro) — plate marks, remaining run, slope lengths and overhang totals per jack.
5. **L / T junctions** (Pro) — equal hip/valley or unequal-pitch joins on an L or T plan.

Skillion is **not** in this build (not claimed, not gated).

Product maths live in `src/lib/roof` (geometry, junction, types, tests). UI in `src/components/roof`.

## Pricing (team freemium lock)

| | |
| --- | --- |
| Free forever | Gable ends, common rafter, birdsmouth |
| One free calculation each | Hip/valley, creeper setout, L/T junctions |
| Paid unlock | Same **$39.99 AUD** one-time purchase unlocks all Pro tools |
| Product id | `roof_setout_pro_unlock` (non-consumable / managed product) |

Native Android and iOS builds use **[@capgo/native-purchases](https://github.com/Cap-go/capacitor-native-purchases)** (Play Billing + StoreKit 2). A successful purchase or restore caches `localStorage` key `roof-setout-au.unlock.v1`. Free-use counters use `roof-setout-au.free-uses.v1`.

**TestFlight only:** complimentary Pro unlock for screenshots (sandbox receipt, no embedded provision). We do **not** bake a Codemagic compile flag into the IPA. App Store and Play customers stay on freemium.

Web/debug builds keep the **local unlock stub** (same flag, not billed).

## Requirements

- Node.js 20+
- Android Studio (Ladybug or newer) for Play builds
- Xcode 16+ on macOS for local App Store builds (iOS 15+), or Codemagic later

## Scripts

```bash
npm install
npm run dev          # Vite SPA at http://localhost:5173
npm test             # geometry + junction + unlock + privacy-docs
npm run build        # sync docs/privacy.html, typecheck, production dist/
npm run cap:sync     # build web assets and copy into android/ + ios/
npm run cap:android  # sync then open Android Studio
npm run cap:ios      # sync then open Xcode (macOS)
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

Source: `public/privacy.html` (copied to `docs/privacy.html` on `npm test` / `npm run build`). Enable Pages: **Settings → Pages → Deploy from branch → `main` / `/docs`**.

## Store next steps (not in this PR)

- [ ] Create Play Console app with application id `com.josh12891.roofsetout`
- [ ] Upload a signed AAB that declares Play Billing, then create IAP `roof_setout_pro_unlock` at AUD 39.99
- [ ] Create App Store Connect app (display name **AU Roof Carpenter**) + StoreKit product `roof_setout_pro_unlock`
- [ ] Paste privacy URL into both stores
- [ ] Subtitle lean: **Metric set-out — rafters, hips, creepers**
- [ ] Generate final icon/splash (`npm run assets` once brand mark is final)
- [ ] No ASC/Play public listings required yet

## Prototype note

The Grok web prototype (`roofing-grok-build/`) was intended as `uploads/*.tgz`. That archive was not present in the agent workspace, so geometry was implemented fresh under `src/lib/roof` to match the freemium product scope (gable / common / hip / creeper / L-T junctions). Drop the tarball into `uploads/` later if you want a diff against the original Grok sources.

## Pattern

Mirrors [Tradies Toolbox](https://github.com/josh12891/chippys-toolbox): Vite web UI in Capacitor iOS+Android, offline-first, freemium IAP via Capgo native purchases.
