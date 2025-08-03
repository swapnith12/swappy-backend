#!/bin/bash

set -e  # Exit immediately if any command fails

echo "🔐 Authenticating with AWS CodeArtifact..."

export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain swappy-backend \
  --domain-owner 692859925831 \
  --region eu-north-1 \
  --query authorizationToken \
  --output text)

echo "//swappy-backend-692859925831.d.codeartifact.eu-north-1.amazonaws.com/npm/swappy-backend/:_authToken=${CODEARTIFACT_AUTH_TOKEN}" > ~/.npmrc

echo "📦 Navigating to app directory..."
cd /home/ec2-user/swappy-backend || exit 1

echo "📦 Installing dependencies with Bun..."
export PATH="$HOME/.bun/bin:$PATH"  # Ensure bun is in PATH if installed earlier
bun install

echo "🚀 Starting the application..."
nohup bun run start > app.log 2>&1 &

echo "✅ Deployment complete."
