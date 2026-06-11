#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeployWebAppStack } from "../lib/deploy-web-app-stack";
import { ProductServiceStack } from "../lib/lambda/product-service-stack";
import { ImportServiceStack } from "../lib/import-service-stack";
import { AuthorizationServiceStack } from "../lib/authorization-service-stack";
import { CartServiceStack } from "../lib/cart-service-stack";

const app = new cdk.App();
new DeployWebAppStack(app, "DeployWebAppStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
const productServiceStack = new ProductServiceStack(app, "ProductServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
const authorizationServiceStack = new AuthorizationServiceStack(app, "AuthorizationServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
new ImportServiceStack(app, "ImportServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  catalogItemsQueue: productServiceStack.catalogItemsQueue,
  basicAuthorizerArn: authorizationServiceStack.basicAuthorizer.functionArn,
});
new CartServiceStack(app, "CartServiceStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
