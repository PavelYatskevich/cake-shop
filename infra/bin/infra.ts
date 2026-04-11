#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { DeployWebAppStack } from '../lib/deploy-web-app-stack';

const app = new cdk.App();
new DeployWebAppStack(app, 'DeployWebAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
