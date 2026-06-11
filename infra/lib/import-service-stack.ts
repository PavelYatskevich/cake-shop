import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { Construct } from "constructs";

export interface ImportServiceStackProps extends cdk.StackProps {
  catalogItemsQueue: sqs.IQueue;
  basicAuthorizerArn: string;
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    const importBucket = new s3.Bucket(this, "ImportProductsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "UploadedFolderMarker", {
      sources: [s3deploy.Source.data("uploaded/.keep", "")],
      destinationBucket: importBucket,
      prune: false,
    });

    const importProductsFileFn = new NodejsFunction(this, "importProductsFile", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      entry: path.join(__dirname, "import-service", "handlers.ts"),
      handler: "importProductsFile",
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
    });

    importBucket.grantPut(importProductsFileFn);

    const importFileParserFn = new NodejsFunction(this, "importFileParser", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      timeout: cdk.Duration.seconds(60),
      entry: path.join(__dirname, "import-service", "handlers.ts"),
      handler: "importFileParser",
      environment: {
        CATALOG_ITEMS_QUEUE_URL: props.catalogItemsQueue.queueUrl,
      },
    });

    importBucket.grantReadWrite(importFileParserFn);
    importBucket.grantDelete(importFileParserFn);
    props.catalogItemsQueue.grantSendMessages(importFileParserFn);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserFn),
      { prefix: "uploaded/" },
    );

    const api = new apigateway.RestApi(this, "import-service-api", {
      restApiName: "Import Service API",
      description: "Presigned upload URLs and import pipeline",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "OPTIONS"],
      },
    });
    const authFailureHeaders = {
      "Access-Control-Allow-Origin": "'*'",
      "Access-Control-Allow-Headers": "'Content-Type,Authorization'",
    };
    api.addGatewayResponse("MissingAuthorizationHeaderResponse", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: "401",
      responseHeaders: authFailureHeaders,
    });
    api.addGatewayResponse("AccessDeniedResponse", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      statusCode: "403",
      responseHeaders: authFailureHeaders,
    });

    const importResource = api.root.addResource("import");
    const basicAuthorizer = new apigateway.CfnAuthorizer(this, "ImportBasicAuthorizer", {
      restApiId: api.restApiId,
      name: "basicAuthorizer",
      type: "TOKEN",
      identitySource: "method.request.header.Authorization",
      authorizerResultTtlInSeconds: 0,
      authorizerUri: cdk.Fn.sub(
        "arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${BasicAuthorizerArn}/invocations",
        {
          BasicAuthorizerArn: props.basicAuthorizerArn,
        },
      ),
    });

    const basicAuthorizerPermission = new lambda.CfnPermission(
      this,
      "BasicAuthorizerInvocationPermission",
      {
        action: "lambda:InvokeFunction",
        functionName: props.basicAuthorizerArn,
        principal: "apigateway.amazonaws.com",
        sourceArn: cdk.Fn.sub(
          "arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${RestApiId}/authorizers/${AuthorizerId}",
          {
            RestApiId: api.restApiId,
            AuthorizerId: basicAuthorizer.ref,
          },
        ),
      },
    );

    const importMethod = importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(importProductsFileFn),
      {
        methodResponses: [
          { statusCode: "200" },
          { statusCode: "400" },
          { statusCode: "401" },
          { statusCode: "403" },
        ],
      },
    );
    const importCfnMethod = importMethod.node.defaultChild as apigateway.CfnMethod;
    importCfnMethod.authorizationType = "CUSTOM";
    importCfnMethod.authorizerId = basicAuthorizer.ref;
    importCfnMethod.addDependency(basicAuthorizer);
    importCfnMethod.addDependency(basicAuthorizerPermission);

    new cdk.CfnOutput(this, "ImportServiceApiUrl", {
      value: api.url,
      description: "Base URL for Import Service API (set VITE_API_IMPORT to this value)",
    });
    new cdk.CfnOutput(this, "ImportProductsFileUrl", {
      value: `${api.url}import`,
      description: "GET with ?name= for presigned PUT URL",
    });
    new cdk.CfnOutput(this, "ImportBucketName", {
      value: importBucket.bucketName,
      description: "S3 bucket for CSV uploads and parsed output",
    });
  }
}
