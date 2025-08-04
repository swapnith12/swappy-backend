#!/bin/bash
echo "🧹 Cleaning old files..."
rm -f /home/ec2-user/swappy-backend/appspec.yml
rm -f /home/ec2-user/swappy-backend/scritps/post_deploy.sh
rm -f /home/ec2-user/swappy-backend/scripts/cleanup.sh