import type { APIGatewayTokenAuthorizerEvent } from "aws-lambda";
import { basicAuthorizer } from "../lib/authorization-service/handlers";

const methodArn = "arn:aws:execute-api:us-east-1:123456789012:api/prod/GET/import";

function createEvent(authorizationToken?: string): APIGatewayTokenAuthorizerEvent {
  return {
    type: "TOKEN",
    methodArn,
    authorizationToken,
  } as APIGatewayTokenAuthorizerEvent;
}

function createBasicToken(login: string, password: string): string {
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

describe("basicAuthorizer", () => {
  const previousPassword = process.env.PavelYatskevich;

  beforeEach(() => {
    process.env.PavelYatskevich = "TEST_PASSWORD";
  });

  afterEach(() => {
    if (previousPassword === undefined) {
      delete process.env.PavelYatskevich;
    } else {
      process.env.PavelYatskevich = previousPassword;
    }
  });

  it("allows a matching Basic authorization token", async () => {
    const result = await basicAuthorizer(
      createEvent(createBasicToken("PavelYatskevich", "TEST_PASSWORD")),
    );

    expect(result.principalId).toBe("PavelYatskevich");
    expect(result.policyDocument.Statement[0].Effect).toBe("Allow");
  });

  it("denies a Basic authorization token with a wrong password", async () => {
    const result = await basicAuthorizer(
      createEvent(createBasicToken("PavelYatskevich", "WRONG_PASSWORD")),
    );

    expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
  });

  it("denies an invalid authorization token", async () => {
    const result = await basicAuthorizer(createEvent("Bearer token"));

    expect(result.policyDocument.Statement[0].Effect).toBe("Deny");
  });

  it("throws Unauthorized when authorization token is missing", async () => {
    await expect(basicAuthorizer(createEvent())).rejects.toThrow("Unauthorized");
  });
});
