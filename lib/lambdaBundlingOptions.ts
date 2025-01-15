import { BundlingOptions, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';
export const lambdaBundlingOptions: BundlingOptions = {
  // bundle SDK v3 internally, see https://github.com/aws/aws-cdk/issues/25492
  // externalModules: [],
  // favor using ESM over CommonJS (better tree-shaking)
  format: OutputFormat.ESM,
  // aws-sdk is not declaring their esm entry point the correct way, so we need to instruct esbuild to favor the "module" field.
  // see https://github.com/aws/aws-cdk/issues/29310
  mainFields: ['module', 'main'],
  // aws x-ray sdk is not compatible with esm, so we need to simulate require import
  // see https://github.com/aws-powertools/powertools-lambda-typescript/blob/aa94f996f9ecfa4cb0c090757919aca62fab9579/docs/upgrade.md?plain=1#L50 (https://docs.powertools.aws.dev/lambda/typescript/latest/upgrade/#unable-to-use-esm)
  banner: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
};
