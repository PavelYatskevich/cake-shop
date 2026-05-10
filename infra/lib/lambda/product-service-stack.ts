import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as path from "path";
import { Construct } from "constructs";

const lambdaBundlingOptions = {
  minify: true,
  sourceMap: true,
};

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "ProductServiceVpc", {
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

    const dbSecurityGroup = new ec2.SecurityGroup(this, "RdsSecurityGroup", {
      vpc,
      description: "PostgreSQL ingress from product Lambdas only",
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(this, "ProductLambdaSecurityGroup", {
      vpc,
      description: "Product service Lambdas",
    });

    const database = new rds.DatabaseInstance(this, "ProductDatabase", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_12,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromGeneratedSecret("productadmin"),
      databaseName: "productservice",
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      publiclyAccessible: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    database.connections.allowFrom(lambdaSecurityGroup, ec2.Port.tcp(5432), "Lambdas to PostgreSQL");

    const databaseSecret = database.secret;
    if (!databaseSecret) {
      throw new Error("RDS instance must use a generated secret for credentials");
    }

    const lambdaVpcProps = {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
    };

    const createNodeFunction = (constructId: string, handlerName: string): NodejsFunction =>
      new NodejsFunction(this, constructId, {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(30),
        entry: path.join(__dirname, "handler.ts"),
        handler: handlerName,
        environment: {
          DATABASE_SECRET_ARN: databaseSecret.secretArn,
        },
        bundling: lambdaBundlingOptions,
        ...lambdaVpcProps,
      });

    const getProductsListLambda = createNodeFunction("get-products-list", "getProductsList");
    const getProductsByIdLambda = createNodeFunction("get-product-by-id", "getProductsById");
    const createProductLambda = createNodeFunction("create-product", "createProduct");

    databaseSecret.grantRead(getProductsListLambda);
    databaseSecret.grantRead(getProductsByIdLambda);
    databaseSecret.grantRead(createProductLambda);

    const api = new apigateway.RestApi(this, "product-service-api", {
      restApiName: "Product Service API",
      description: "HTTP API for Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "OPTIONS"],
      },
    });

    const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLambda);
    const getProductsByIdIntegration = new apigateway.LambdaIntegration(getProductsByIdLambda);
    const createProductIntegration = new apigateway.LambdaIntegration(createProductLambda);

    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", getProductsListIntegration, {
      methodResponses: [{ statusCode: "200" }, { statusCode: "500" }],
    });
    productsResource.addMethod("POST", createProductIntegration, {
      methodResponses: [
        { statusCode: "201" },
        { statusCode: "400" },
        { statusCode: "500" },
      ],
    });
    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod("GET", getProductsByIdIntegration, {
      methodResponses: [{ statusCode: "200" }, { statusCode: "404" }, { statusCode: "500" }],
    });

    new cdk.CfnOutput(this, "ProductServiceApiUrl", {
      value: api.url,
      description: "Base URL for Product Service API",
    });
    new cdk.CfnOutput(this, "GetProductsListUrl", {
      value: `${api.url}products`,
      description: "Invoke URL for getProductsList lambda",
    });
    new cdk.CfnOutput(this, "GetProductsByIdUrlTemplate", {
      value: `${api.url}products/{productId}`,
      description: "Invoke URL template for getProductsById lambda",
    });
    new cdk.CfnOutput(this, "CreateProductUrl", {
      value: `${api.url}products`,
      description: "Invoke URL for createProduct lambda",
    });
    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: databaseSecret.secretArn,
      description: "Secrets Manager ARN for DB credentials (use for local seed; do not commit secret values)",
    });
  }
}
