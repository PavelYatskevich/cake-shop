# CDK — static site (S3 + CloudFront)

The `DeployWebAppStack` provisions a private S3 bucket, a CloudFront distribution (origin access), and deploys the **parent app’s** production build from `../dist`.

From the **repository root**, prefer:

- `npm run cdk:synth` — build the SPA and synthesize
- `npm run cdk:deploy` — build and deploy (includes CloudFront invalidation on content changes)
- `npm run cdk:destroy` — tear down the stack

From this directory, after `npm run build` in the parent project:

* `npm run build` — compile TypeScript
* `npm run synth` / `npm run deploy` / `npm run destroy` — CDK CLI wrappers
* `npx cdk diff` — compare deployed stack with current state

The `cdk.json` file tells the CDK Toolkit how to execute the app.
