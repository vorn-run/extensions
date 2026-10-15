#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
yarn typecheck && yarn test && yarn build
node scripts/check-packages.mjs
node node_modules/@vornrun/connector-sdk/dist/cli.js check mysql/dist/index.js --mock --receipt mysql/verified.json
