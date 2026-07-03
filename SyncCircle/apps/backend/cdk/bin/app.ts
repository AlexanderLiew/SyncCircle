#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { FriendsStack } from '../lib/friends-stack';

const app = new App();

new FriendsStack(app, 'FriendsStack', {
  env: {
    account: '368082409177',
    region: 'ap-southeast-1',
  },
  description: 'SyncCircle Friends Backend - Cognito, API Gateway, Lambda, DynamoDB, SES, CloudWatch',
  sesSenderEmail: process.env.SES_SENDER_EMAIL || 'alexanderliew2001@gmail.com',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:5173',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : undefined,
});

app.synth();
