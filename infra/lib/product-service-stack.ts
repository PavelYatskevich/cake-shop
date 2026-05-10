import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsListLambda = new NodejsFunction(this, 'get-products-list', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, 'hello-lambda', 'handler.ts'),
      handler: 'getProductsList',
    });
    const getProductsByIdLambda = new NodejsFunction(this, 'get-product-by-id', {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, 'hello-lambda', 'handler.ts'),
      handler: 'getProductsById',
    });

    const api = new apigateway.RestApi(this, "product-service-api", {
      restApiName: "Product Service API",
      description: "HTTP API for Product Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      },
    });

    const getProductsListIntegration = new apigateway.LambdaIntegration(getProductsListLambda);
    const getProductsByIdIntegration = new apigateway.LambdaIntegration(getProductsByIdLambda);

    const productsResource = api.root.addResource("products");
    productsResource.addMethod('GET', getProductsListIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
    const productByIdResource = productsResource.addResource("{productId}");
    productByIdResource.addMethod('GET', getProductsByIdIntegration, {
      methodResponses: [
        { statusCode: '200' },
        { statusCode: '404' },
      ],
    });

    new cdk.CfnOutput(this, 'ProductServiceApiUrl', {
      value: api.url,
      description: 'Base URL for Product Service API',
    });
    new cdk.CfnOutput(this, "GetProductsListUrl", {
      value: `${api.url}products`,
      description: "Invoke URL for getProductsList lambda",
    });
    new cdk.CfnOutput(this, "GetProductsByIdUrlTemplate", {
      value: `${api.url}products/{productId}`,
      description: "Invoke URL template for getProductsById lambda",
    });
  }
}
