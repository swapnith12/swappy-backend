cd /home/ec2-user/swappy-backend || exit 1

echo "Installing dependencies with Bun..."
bun install

echo "Starting application..."

nohup bun run start > app.log 2>&1 &

echo "Deployment complete."
