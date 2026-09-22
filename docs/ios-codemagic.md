# iOS CI on Codemagic (no local Mac)

Build a **signed App Store IPA** for AU Roof Carpenter on a cloud Mac, then optionally upload it to **TestFlight**. You do not need a Mac at home.

| | |
| --- | --- |
| Workflow | `ios-app-store` in [`codemagic.yaml`](../codemagic.yaml) |
| Machine | `mac_mini_m2` |
| Bundle id | `com.josh12891.roofsetout` |
| Display name | AU Roof Carpenter |
| IAP product | `roof_setout_pro_unlock` ($39.99 AUD — StoreKit, not the CI file) |
| ASC integration | **`tradies-toolbox-asc-2`** (Key ID `KD39VS5B9X`; must match Team integrations Developer Portal key name) |
| App Store Apple ID | `6814817371` (`APP_STORE_APPLE_ID` — ASC app `com.josh12891.roofsetout`) |
| Secrets | Codemagic UI only. Never commit `.p8`, `.p12`, or passwords. |

## Cost

- **Free individual plan:** 500 Mac mini M2 minutes refilled every month.
- **After that:** about **$0.095 / minute** on M2 ([Codemagic pricing](https://codemagic.io/pricing)).
- A first Capacitor + Xcode archive is often **15–30 minutes**. `ios-app-store` starts on **push to `main`** (and can still be started from the Codemagic UI).

## 1. Sign up and connect GitHub

1. Create a free account at [codemagic.io](https://codemagic.io) (GitHub login is fine).
2. **Add application** → connect **GitHub** → repo **`josh12891/roof-setout-au`**.
3. Project type can be **Ionic Capacitor** or **iOS**.
4. Open the app → **codemagic.yaml** → scan **`main`** (or this PR branch) and confirm workflows **iOS App Store IPA** (`ios-app-store`) and **Android Play AAB** (`android-play`) appear.

## 2. Create an App Store Connect API key (or reuse Tradies)

Needs an Apple Developer Program membership.

**Use the Codemagic Personal team Developer Portal key `tradies-toolbox-asc-2`** (Key ID `KD39VS5B9X`). An App Manager ASC API key can sign and upload any app under the same Apple team, including `com.josh12891.roofsetout`. `codemagic.yaml` points `integrations.app_store_connect` at that name. The yaml value must match the Team integrations Developer Portal key name.

Only create a second key named **`au-roof-carpenter-asc`** if team policy requires a dedicated key — then change `integrations.app_store_connect` in the yaml to match and upload that `.p8` instead.

To create a new key if needed:

1. [App Store Connect](https://appstoreconnect.apple.com) → **Users and Access** → **Integrations** → **App Store Connect API**.
2. **+** new key. Name: `Codemagic` (or similar). Access: **App Manager**.
3. **Generate**, then **Download API Key** (`.p8` — Apple shows it once). Save it in a password manager, not git.
4. Note **Issuer ID** (top of the keys table) and **Key ID**.

## 3. Add the key to Codemagic

**Team integrations (recommended):**

1. Codemagic → **Team settings** → **Team integrations** → **Developer Portal** → **Manage keys**.
2. Confirm a key named exactly **`tradies-toolbox-asc-2`** exists (Key ID `KD39VS5B9X`). The yaml name must match the Team integrations Developer Portal key name (or add **`au-roof-carpenter-asc`** and update the yaml).
3. `ios-app-store` already sets `integrations.app_store_connect: tradies-toolbox-asc-2`. That injects `APP_STORE_CONNECT_*` so signing and TestFlight publish run when the key exists. Do not put the `.p8` in git.

**Or Application / Team variables** (group name `app_store_credentials` if you uncomment `environment.groups` in the yaml):

| Variable | Secret? | Value |
| --- | --- | --- |
| `APP_STORE_CONNECT_ISSUER_ID` | yes | Issuer ID |
| `APP_STORE_CONNECT_KEY_IDENTIFIER` | yes | Key ID |
| `APP_STORE_CONNECT_PRIVATE_KEY` | yes | Full `.p8` text |
| `APP_STORE_APPLE_ID` | no | `6814817371` — numeric Apple ID from App Store Connect → **AU Roof Carpenter** → **App Information** |
| `PUBLISH_TESTFLIGHT` | no | Application variable (optional). Yaml default is `true`. Set `false` in the Codemagic UI to skip upload |

Personal Codemagic accounts may not have Application variable groups. In that case keep `APP_STORE_APPLE_ID` in [`codemagic.yaml`](../codemagic.yaml) (already set to `6814817371`). Keep `.p8` / `.p12` / passwords in the Codemagic UI — never commit them.

## 4. Code signing (one of these)

App Store / TestFlight needs an **Apple Distribution** certificate and an **App Store** provisioning profile for `com.josh12891.roofsetout`.

### A. Automatic via the ASC API (easiest)

1. Finish step 3 so Codemagic can talk to Apple.
2. **Team settings** → **codemagic.yaml settings** → **Code signing identities**.
3. **iOS certificates** → **Generate certificate** → type **Apple Distribution** → pick the ASC key → Create. Download the `.p12` + password into your password manager (shown once).
4. **iOS provisioning profiles** → **Fetch profiles** → pick the **App Store** profile for `com.josh12891.roofsetout` (create that App ID / profile in the Apple Developer portal first if none exists).
5. `ios_signing` in the yaml fetches those files on each build (`distribution_type: app_store`).

If `APP_STORE_CONNECT_*` is present, the workflow also runs `app-store-connect fetch-signing-files --type IOS_APP_STORE --create` so Apple can create a matching profile when you allow that.

### B. Upload your own files

Same **Code signing identities** screens: upload a `.p12` distribution cert and a `.mobileprovision` App Store profile. `ios_signing` matches them by bundle id.

## 5. Run the workflow

1. Push to **`main`** (Codemagic starts `ios-app-store` automatically), or open the Codemagic app page → **Start new build**.
2. Workflow **iOS App Store IPA**. Branch: **`main`**.
3. When it finishes, download **`App.ipa`** from artifacts (and TestFlight if `PUBLISH_TESTFLIGHT` and the ASC key are present).

The Xcode project is `ios/App/App.xcworkspace`, scheme **App**. Web build is `npm ci` → `npm run build` → `npx cap sync ios`.

## 6. TestFlight (guarded)

Publishing **does not fail the build** when Apple credentials are missing. The signed IPA stays a downloadable artifact.

Upload happens only when **all** of these are true:

- `PUBLISH_TESTFLIGHT` is `true` (yaml default; override with Application variable `PUBLISH_TESTFLIGHT` in the Codemagic UI)
- The Developer Portal integration **`tradies-toolbox-asc-2`** is present (or `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_IDENTIFIER`, and `APP_STORE_CONNECT_PRIVATE_KEY` are set as Application secrets)

Then `app-store-connect publish` uploads the IPA. It appears under TestFlight after Apple processing (often 5–15 minutes). Internal testers can install; turn on external groups in App Store Connect if you need them.

### Screenshots (TestFlight testers)

The TestFlight binary **auto-unlocks** hip set-out, creeper schedule, and L/T junctions when it detects a TestFlight install (`sandboxReceipt` and no `embedded.mobileprovision`). App Store customers still pay. This is for Lauren (`lozzpearson@gmail.com`) and other internal testers to capture Pro screenshots without buying — it does **not** unlock App Store production builds.

1. Install the new TestFlight build.
2. Open **Hip set-out**, **Creeper schedule**, and **L / T junctions** — Pro results already work. You do not need to tap Unlock or buy.
3. About shows a TestFlight note and **Restore purchases** if you are checking the real sandbox IAP (`roof_setout_pro_unlock`).
4. App Store production builds are **not** unlocked this way. Complimentary unlock is not written to `roof-setout-au.unlock.v1`.

To skip upload: set Application variable `PUBLISH_TESTFLIGHT` to `false` in the Codemagic UI.

Keep `publishing.app_store_connect` commented. The script publisher already uploads when the integration is present. Enabling the native publisher as well would upload twice.

## 7. App Store Connect app record

**AU Roof Carpenter** (`com.josh12891.roofsetout`, Apple ID **`6814817371`**) already exists in App Store Connect. Subtitle lean: **Metric set-out — rafters, hips, creepers**. Seller **Australian Dynamics**. Support **australiancomsnetwork@gmail.com**. Privacy URL: `https://josh12891.github.io/roof-setout-au/privacy.html`. IAP `roof_setout_pro_unlock` at **$39.99 AUD** is created in the app record (see README); CI does not create the product. `APP_STORE_APPLE_ID` is set to `6814817371` in [`codemagic.yaml`](../codemagic.yaml) (or override as an Application variable).

## Checklist

- [ ] Codemagic free account, GitHub repo `josh12891/roof-setout-au` connected, yaml scanned
- [x] `APP_STORE_APPLE_ID` set to `6814817371` (ASC app exists)
- [ ] Developer Portal key **`tradies-toolbox-asc-2`** (Key ID `KD39VS5B9X`; name must match Team integrations) reused (or dedicated `au-roof-carpenter-asc` + yaml rename)
- [ ] ASC API key stored in Codemagic + password manager (never git)
- [ ] Distribution cert + App Store profile for `com.josh12891.roofsetout` in Code signing identities
- [ ] Manual **ios-app-store** build produces `App.ipa`
- [ ] With the integration present and `PUBLISH_TESTFLIGHT=true`, IPA shows in TestFlight
- [ ] Nothing secret committed (`.p8` / `.p12` / `.mobileprovision` stay gitignored)
