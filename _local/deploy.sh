#!/bin/bash

# Eldraeverse Theme Deployment Script
# Deploys the theme to wraith:/opt/ghost/data/ghost/themes/eldraeverse
# 
# Prerequisites:
# - SSH access to wraith
# - Docker Compose running on wraith with ghost and caddy services
# - All changes committed and pushed
# - npm test passing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 Building theme..."
cd "$REPO_ROOT"
npm test > /dev/null 2>&1 || (echo "❌ Build failed. Run 'npm test' for details." && exit 1)

echo "🗜️  Creating deployment archive..."
tar --exclude=node_modules --exclude=.git --exclude=gulpfile.js --exclude=package-lock.json --exclude='*.map' --exclude='_local' -czf /tmp/eldraeverse-deploy.tar.gz .

echo "📤 Transferring to wraith..."
scp /tmp/eldraeverse-deploy.tar.gz wraith:/tmp/

echo "📥 Extracting on wraith..."
ssh wraith "mkdir -p /opt/ghost/data/ghost/themes/eldraeverse && cd /opt/ghost/data/ghost/themes/eldraeverse && tar -xzf /tmp/eldraeverse-deploy.tar.gz --strip-components=1"

echo "🔄 Restarting Ghost..."
ssh wraith "cd /opt/ghost && docker compose up -d --force-recreate ghost caddy > /dev/null 2>&1"

echo "✅ Deployment complete!"
echo ""
echo "Theme deployed to: wraith:/opt/ghost/data/ghost/themes/eldraeverse"
echo "Ghost restarted with updated theme."
