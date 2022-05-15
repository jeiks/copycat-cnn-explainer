#!/bin/bash
set -o errexit

TARGET='./docs'

npm install
npm run build

rm -rf $TARGET
mkdir -p $TARGET
cp -r ./public $TARGET

git add -A
git commit -m "Updating Copycat CNN explainer pages"
git push origin main
