#!/bin/bash
echo "🧹 Cleaning old files..."
rm -f /home/ec2-user/swappy-backend/appspec.yml
rm -f /home/ec2-user/swappy-backend/scripts/post_deploy.sh
rm -rf /home/ec2-user/swappy-backend/dist