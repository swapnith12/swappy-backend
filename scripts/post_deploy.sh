#!/bin/bash

cd /home/ec2-user/swappy-backend || exit 1

export PATH="$HOME/.bun/bin:$PATH"

echo "Installing dependencies with Bun..."
bun install

echo "Starting application..."
mkdir -p logs
nohup bun run start > logs/app.log 2>&1 &

echo "Deployment complete."
