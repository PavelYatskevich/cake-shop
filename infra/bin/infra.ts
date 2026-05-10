#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ProductServiceStack } from "../lib/lambda/product-service-stack";
import { ImportServiceStack } from "../lib/import-service-stack";

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new cdk.App();
new DeployWebAppStack(app, "DeployWebAppStack", {
  env,
});
new ProductServiceStack(app, "ProductServiceStack", {
  env,
});
new ImportServiceStack(app, "ImportServiceStack", {
  env,
});
