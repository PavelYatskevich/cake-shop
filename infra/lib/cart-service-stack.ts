import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as path from "path";
import { Construct } from "constructs";

const cartServiceRoot = path.join(__dirname, "..", "..", "cart-service");

export class CartServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "CartServiceVpc", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { cidrMask: 24, name: "public", subnetType: ec2.SubnetType.PUBLIC },
        {
          cidrMask: 24,
          name: "private-app",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    const dbSecurityGroup = new ec2.SecurityGroup(this, "CartRdsSecurityGroup", {
      vpc,
      description: "PostgreSQL ingress from cart Lambda only",
    });
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, "CartLambdaSecurityGroup", {
      vpc,
      description: "Cart service Lambda",
    });

    const databaseName = "cartservice";
    const database = new rds.DatabaseInstance(this, "CartDatabase", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_12,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret("cartadmin"),
      databaseName,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    database.connections.allowFrom(lambdaSecurityGroup, ec2.Port.tcp(5432), "Cart Lambda to PostgreSQL");

    const databaseSecret = database.secret;
    if (!databaseSecret) {
      throw new Error("RDS instance must use a generated secret for credentials");
    }

    const lambdaFunction = new lambdaNodejs.NodejsFunction(this, "CartServiceLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      entry: path.join(cartServiceRoot, "src", "lambda.ts"),
      handler: "handler",
      depsLockFilePath: path.join(cartServiceRoot, "package-lock.json"),
      projectRoot: cartServiceRoot,
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DB_SSL: "true",
        TYPEORM_SYNCHRONIZE: "true",
      },
      bundling: {
        minify: false,
        sourceMap: true,
        target: "node20",
        nodeModules: [
          "@aws-sdk/client-secrets-manager",
          "@codegenie/serverless-express",
          "@nestjs/common",
          "@nestjs/config",
          "@nestjs/core",
          "@nestjs/jwt",
          "@nestjs/passport",
          "@nestjs/platform-express",
          "helmet",
          "passport",
          "passport-http",
          "passport-jwt",
          "passport-local",
          "pg",
          "reflect-metadata",
          "rxjs",
          "typeorm",
          "uuid",
        ],
        externalModules: [
          "@nestjs/microservices",
          "@nestjs/websockets",
          "cache-manager",
          "class-transformer",
          "class-validator",
          "pg-native",
        ],
      },
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
    });

    databaseSecret.grantRead(lambdaFunction);

    const api = new apigateway.RestApi(this, "cart-service-api", {
      restApiName: "Cart Service API",
      description: "HTTP API for Cart Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });
    const integration = new apigateway.LambdaIntegration(lambdaFunction);

    api.root.addMethod("ANY", integration);
    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });

    new cdk.CfnOutput(this, "CartServiceApiUrl", {
      value: api.url,
      description: "Base URL for Cart Service API (set VITE_API_CART to this value)",
    });
    new cdk.CfnOutput(this, "CartProfileUrl", {
      value: `${api.url}api/profile/cart`,
      description: "Profile cart endpoint",
    });
    new cdk.CfnOutput(this, "CartDatabaseSecretArn", {
      value: databaseSecret.secretArn,
      description: "Secrets Manager ARN for Cart Service database credentials",
    });
  }
}
