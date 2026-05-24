import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { ImportServiceStack } from "../lib/import-service-stack";

describe("ImportServiceStack", () => {
  it("protects GET /import with the basic authorizer", () => {
    const app = new cdk.App();
    const dependenciesStack = new cdk.Stack(app, "DependenciesStack");
    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      dependenciesStack,
      "CatalogItemsQueue",
      "arn:aws:sqs:us-east-1:123456789012:catalogItemsQueue",
    );

    const stack = new ImportServiceStack(app, "TestImportServiceStack", {
      catalogItemsQueue,
      basicAuthorizerArn: "arn:aws:lambda:us-east-1:123456789012:function:basicAuthorizer",
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::ApiGateway::Authorizer", {
      Name: "basicAuthorizer",
      Type: "TOKEN",
      IdentitySource: "method.request.header.Authorization",
      AuthorizerResultTtlInSeconds: 0,
    });
    template.hasResourceProperties("AWS::ApiGateway::Method", {
      HttpMethod: "GET",
      AuthorizationType: "CUSTOM",
      AuthorizerId: Match.anyValue(),
    });
    template.hasResourceProperties("AWS::ApiGateway::GatewayResponse", {
      ResponseType: "UNAUTHORIZED",
      StatusCode: "401",
    });
    template.hasResourceProperties("AWS::ApiGateway::GatewayResponse", {
      ResponseType: "ACCESS_DENIED",
      StatusCode: "403",
    });
  });
});
