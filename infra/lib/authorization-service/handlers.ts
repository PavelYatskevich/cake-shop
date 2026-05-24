import type {
  APIGatewayAuthorizerResult,
  APIGatewayTokenAuthorizerEvent,
} from "aws-lambda";

type PolicyEffect = "Allow" | "Deny";

function createPolicy(
  principalId: string,
  effect: PolicyEffect,
  resource: string,
): APIGatewayAuthorizerResult {
  return {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}

function parseCredentials(
  authorizationToken: string,
): { login: string; password: string } | undefined {
  const [scheme, encodedToken, ...rest] = authorizationToken.trim().split(/\s+/);
  if (scheme !== "Basic" || !encodedToken || rest.length > 0) {
    return undefined;
  }

  const decodedToken = Buffer.from(encodedToken, "base64").toString("utf8");
  const separatorIndex = decodedToken.indexOf(":");
  if (separatorIndex <= 0) {
    return undefined;
  }

  return {
    login: decodedToken.slice(0, separatorIndex),
    password: decodedToken.slice(separatorIndex + 1),
  };
}

export async function basicAuthorizer(
  event: APIGatewayTokenAuthorizerEvent,
): Promise<APIGatewayAuthorizerResult> {
  const authorizationToken = event.authorizationToken;
  if (!authorizationToken) {
    throw new Error("Unauthorized");
  }

  const credentials = parseCredentials(authorizationToken);
  if (!credentials) {
    return createPolicy("anonymous", "Deny", event.methodArn);
  }

  const expectedPassword = process.env[credentials.login];
  const effect = expectedPassword === credentials.password ? "Allow" : "Deny";

  return createPolicy(credentials.login, effect, event.methodArn);
}
