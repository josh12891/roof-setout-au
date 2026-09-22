#!/usr/bin/env bash
# Sync Capacitor web assets and produce a Play-signed release AAB.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROPS="$ROOT/android/keystore.properties"
JKS="$ROOT/android/upload-keystore.jks"
AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"

if [[ ! -f "$PROPS" ]]; then
  echo "Missing $PROPS — copy android/keystore.properties.example and fill passwords." >&2
  exit 1
fi
if [[ ! -f "$JKS" ]]; then
  echo "Missing $JKS — restore the Play upload keystore (see UPLOAD_KEYSTORE.md)." >&2
  exit 1
fi

if [[ ! -f "$ROOT/android/local.properties" ]]; then
  SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
  if [[ -z "$SDK" ]]; then
    echo "Set ANDROID_HOME / ANDROID_SDK_ROOT or create android/local.properties with sdk.dir=..." >&2
    exit 1
  fi
  # Gradle wants escaped Windows paths; on Unix a plain path is fine.
  printf 'sdk.dir=%s\n' "$SDK" > "$ROOT/android/local.properties"
fi

npm run cap:sync

(
  cd "$ROOT/android"
  ./gradlew :app:bundleRelease --no-daemon
)

if [[ ! -f "$AAB" ]]; then
  echo "Expected AAB was not produced at $AAB" >&2
  exit 1
fi

python3 - "$ROOT" "$AAB" <<'PY'
import pathlib, sys, zipfile

root = pathlib.Path(sys.argv[1])
aab = pathlib.Path(sys.argv[2])
app_id = "com.josh12891.tradiestoolbox"
billing = "com.android.vending.BILLING"

manifests = list((root / "android/app/build/intermediates").rglob("AndroidManifest.xml"))
merged = [p for p in manifests if "release" in str(p).lower()]
if not merged:
    sys.exit("No release merged AndroidManifest.xml under intermediates/")

found_billing = False
found_pkg = False
for path in merged:
    text = path.read_text(encoding="utf-8", errors="replace")
    if billing in text:
        found_billing = True
    if app_id in text:
        found_pkg = True

if not found_billing:
    sys.exit(f"Merged release manifest is missing {billing}")
if not found_pkg:
    sys.exit(f"Merged release manifest is missing package {app_id}")

# AAB is a zip; binary proto manifest still contains the ASCII permission / package strings.
with zipfile.ZipFile(aab) as zf:
    names = zf.namelist()
    if "base/manifest/AndroidManifest.xml" not in names:
        sys.exit("AAB is missing base/manifest/AndroidManifest.xml")
    raw = zf.read("base/manifest/AndroidManifest.xml")
    if billing.encode("ascii") not in raw:
        sys.exit(f"AAB binary manifest is missing {billing}")
    if app_id.encode("ascii") not in raw:
        sys.exit(f"AAB binary manifest is missing {app_id}")

print(f"OK: signed AAB {aab}")
print(f"OK: applicationId {app_id}")
print(f"OK: {billing} present in merged manifest and AAB")
print(f"size={aab.stat().st_size} bytes")
PY
