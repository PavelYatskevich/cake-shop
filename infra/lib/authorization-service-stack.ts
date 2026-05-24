import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { existsSync, readFileSync } from "fs";
import * as path from "path";
import { Construct } from "constructs";

function loadCredentials(): Record<string, string> {
  const envPath = path.join(__dirname, "..", ".env");
  if (!existsSync(envPath)) {
    throw new Error("Create infra/.env with a GitHub login and password, for example: PavelYatskevich=TEST_PASSWORD");
  }

  const credentials = readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce<Record<string, string>>((acc, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) {
        throw new Error(`Invalid authorization credential entry in infra/.env: ${line}`);
      }

      const login = line.slice(0, separatorIndex).trim();
      const password = line.slice(separatorIndex + 1).trim();
      if (!/^[A-Za-z][A-Za-z0-9_]+$/.test(login)) {
        throw new Error(`Invalid Lambda environment variable name in infra/.env: ${login}`);
      }

      acc[login] = password;
      return acc;
    }, {});

  if (Object.keys(credentials).length === 0) {
    throw new Error("Add at least one credential to infra/.env, for example: PavelYatskevich=TEST_PASSWORD");
  }

  return credentials;
}

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly basicAuthorizer: lambda.IFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.basicAuthorizer = new NodejsFunction(this, "basicAuthorizer", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, "authorization-service", "handlers.ts"),
      handler: "basicAuthorizer",
      environment: loadCredentials(),
    });

    new cdk.CfnOutput(this, "BasicAuthorizerLambdaName", {
      value: this.basicAuthorizer.functionName,
      description: "Lambda authorizer used by Import Service API",
    });
  }
}
