# React-shop-cloudfront

- **CloudFront:** https://dhpw6bwd3hn1p.cloudfront.net
- **S3 static website:** http://fima23-aws-bucket.s3-website.eu-north-1.amazonaws.com/
- Products api endpoint: https://fn4tlfb8nk.execute-api.us-east-1.amazonaws.com/prod/products/

This is frontend starter project for nodejs-aws mentoring program. It uses the following technologies:

- [Vite](https://vitejs.dev/) as a project bundler
- [React](https://beta.reactjs.org/) as a frontend framework
- [React-router-dom](https://reactrouterdotcom.fly.dev/) as a routing library
- [MUI](https://mui.com/) as a UI framework
- [React-query](https://react-query-v3.tanstack.com/) as a data fetching library
- [Formik](https://formik.org/) as a form library
- [Yup](https://github.com/jquense/yup) as a validation schema
- [Serverless](https://serverless.com/) as a serverless framework
- [AWS CDK](https://aws.amazon.com/cdk/) for infrastructure as code (`infra/`)
- [Vitest](https://vitest.dev/) as a test runner
- [MSW](https://mswjs.io/) as an API mocking library
- [Eslint](https://eslint.org/) as a code linting tool
- [Prettier](https://prettier.io/) as a code formatting tool
- [TypeScript](https://www.typescriptlang.org/) as a type checking tool

## Available Scripts

### `start`

Starts the project in dev mode with mocked API on local environment.

### `build`

Builds the project for production in `dist` folder.

### `preview`

Starts the project in production mode on local environment.

### `test`, `test:ui`, `test:coverage`

Runs tests in console, in browser or with coverage.

### `lint`, `prettier`

Runs linting and formatting for all files in `src` folder.

### `client:deploy`, `client:deploy:nc`

Deploy the project build from `dist` folder to configured in `serverless.yml` AWS S3 bucket with or without confirmation.

### `client:build:deploy`, `client:build:deploy:nc`

Combination of `build` and `client:deploy` commands with or without confirmation.

### `cloudfront:setup`

Deploy configured in `serverless.yml` stack via CloudFormation.

### `cloudfront:domainInfo`

Display cloudfront domain information in console.

### `cloudfront:invalidateCache`

Invalidate cloudfront cache.

### `cloudfront:build:deploy`, `cloudfront:build:deploy:nc`

Combination of `client:build:deploy` and `cloudfront:invalidateCache` commands with or without confirmation.

### `cloudfront:update:build:deploy`, `cloudfront:update:build:deploy:nc`

Combination of `cloudfront:setup` and `cloudfront:build:deploy` commands with or without confirmation.

### `serverless:remove`

Remove an entire stack configured in `serverless.yml` via CloudFormation.

### `infra:install`

Runs `npm install` in the `infra` folder. Use once after clone (or whenever `infra/node_modules` is missing) before CDK commands.

### `cdk:synth`

Builds the React app into `dist/`, then synthesizes the CDK stack in `infra/` (CloudFormation template).

### `cdk:deploy`

Builds the app and deploys the CDK stack. Uploads `dist/` to the stack’s S3 bucket and invalidates CloudFront (`BucketDeployment` with `distributionPaths`).

### `cdk:destroy`

Destroys the CDK-provisioned stack (S3 bucket and CloudFront distribution defined in `DeployWebAppStack`).

Configure AWS credentials (for example `aws configure` or environment variables). For an explicit account and region, set `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION` before deploy.
