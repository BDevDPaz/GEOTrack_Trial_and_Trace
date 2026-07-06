#!/data/data/com.termux/files/usr/bin/bash

set -e

DEST="/storage/emulated/0/Documents/Termux"

mkdir -p "$DEST"

cp src/core/boot.ts                           "$DEST/boot.ts.txt"
cp src/core/effects/index.ts                  "$DEST/effects.index.ts.txt"
cp src/core/reducer/index.ts                  "$DEST/reducer.index.ts.txt"
cp src/core/runtime/sessionStoreAdapter.ts    "$DEST/sessionStoreAdapter.ts.txt"
cp src/core/runtime/locationAdapter.ts        "$DEST/locationAdapter.ts.txt"
cp src/core/workTrackerEngine.ts              "$DEST/workTrackerEngine.ts.txt"
cp app/'(tabs)'/index.tsx                     "$DEST/tabs.index.tsx.txt"
cp app/'(tabs)'/report.tsx                    "$DEST/tabs.report.tsx.txt"

echo
echo "Archivos exportados a:"
echo "$DEST"
echo

ls -lh "$DEST" | grep -E 'boot|effects|reducer|session|location|workTracker|tabs'

