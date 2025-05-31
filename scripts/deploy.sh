#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
  echo "BUILD FAILED. Deployment aborted."
  exit 1
fi

echo "Build successful. Bumping version..."
# Temporarily disable exit on error for npm version, as it might fail if git repo is dirty for other reasons
set +e
npm version patch -m "chore: Bump version to %s for deployment"
VERSION_EXIT_CODE=$?
set -e

if [ $VERSION_EXIT_CODE -ne 0 ]; then
  echo "NPM VERSION FAILED. This could be due to a dirty git repo or other issues."
  echo "Build was successful, but versioning failed. Deployment aborted before Netlify."
  exit 1
fi

echo "Version bumped successfully. Deploying to Netlify..."
# Temporarily disable exit on error for Netlify deploy to handle rollback
set +e
npx netlify deploy --prod
NETLIFY_EXIT_CODE=$?
set -e

if [ $NETLIFY_EXIT_CODE -eq 0 ]; then
  echo "Netlify deployment successful. Pushing changes..."
  git push && git push --tags
  if [ $? -ne 0 ]; then
    echo "Netlify deploy & versioning succeeded, but git push failed. Please push manually."
  else
    echo "Deployment and push successful!"
  fi
else
  echo "NETLIFY DEPLOY FAILED."
  echo "Reverting local version bump..."
  git reset HEAD~1 --hard
  echo "Local version bump reverted. Please fix deployment issues."
  exit 1
fi

exit 0 