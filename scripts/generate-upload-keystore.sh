#!/usr/bin/env bash
# One-time Play upload key. Refuses to overwrite an existing .jks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JKS="$ROOT/android/upload-keystore.jks"
PROPS="$ROOT/android/keystore.properties"
NOTES="$ROOT/UPLOAD_KEYSTORE.md"
ALIAS="upload"
DNAME="CN=Joshua Pearson, OU=Australian Dynamics, O=Australian Dynamics, L=Australia, ST=Australia, C=AU"
VALIDITY_DAYS=10000

if [[ -f "$JKS" ]]; then
  echo "Refusing to overwrite existing upload keystore at $JKS" >&2
  exit 1
fi

STORE_PASSWORD="${STORE_PASSWORD:-$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32)}"
KEY_PASSWORD="${KEY_PASSWORD:-$STORE_PASSWORD}"

# PKCS12 inside a .jks filename — Gradle and Play both accept this; Android docs still use .jks.
keytool -genkeypair \
  -keystore "$JKS" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS" \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -dname "$DNAME" \
  -storetype PKCS12

cat > "$PROPS" <<EOF
storeFile=upload-keystore.jks
storePassword=$STORE_PASSWORD
keyAlias=$ALIAS
keyPassword=$KEY_PASSWORD
EOF

cat > "$NOTES" <<EOF
# Tradies Toolbox — Play upload keystore

**Keep this file and \`android/upload-keystore.jks\` off git and in a password manager.**
The first AAB uploaded to Play is signed with this key. Losing it blocks later updates
until you request an upload-key reset from Google.

| | |
| --- | --- |
| File | \`android/upload-keystore.jks\` |
| Key alias | \`$ALIAS\` |
| Store password | \`$STORE_PASSWORD\` |
| Key password | \`$KEY_PASSWORD\` |
| Store type | PKCS12 (file named \`upload-keystore.jks\`) |
| Algorithm | RSA 2048 |
| Validity | $VALIDITY_DAYS days |
| Distinguished name | $DNAME |
| Application id | \`com.josh12891.tradiestoolbox\` |
| Package / Play app | Tradies Toolbox |

Gradle reads \`android/keystore.properties\` (copy of \`android/keystore.properties.example\`).

Rebuild:

\`\`\`bash
cp android/keystore.properties.example android/keystore.properties
# paste the passwords above
npm run android:bundle
# AAB: android/app/build/outputs/bundle/release/app-release.aab
\`\`\`
EOF

chmod 600 "$JKS" "$PROPS" "$NOTES"
echo "Wrote $JKS, $PROPS, and $NOTES"
