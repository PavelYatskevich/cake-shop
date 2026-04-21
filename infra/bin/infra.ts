#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeployWebAppStack } from '../lib/deploy-web-app-stack';
import { ProductServiceStack } from '../lib/hello-lambda/hello-lambda-stack';


const app = new cdk.App();
new DeployWebAppStack(app, 'DeployWebAppStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
new ProductServiceStack(app, 'ProductServiceStack');
