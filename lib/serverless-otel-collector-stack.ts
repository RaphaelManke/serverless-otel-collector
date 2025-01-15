import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { ApiKey } from 'aws-cdk-lib/aws-apigateway';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { CollectorApi } from './collector-api.js';
import { CollectorLambda } from './collector-lambda.js';
export class ServerlessOtelCollectorStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /** 
     * Webhook Endpoint to put data on sqs queu 
     */
    const apiKey = new ApiKey(this, 'ApiKey');
    
    const otelJsonDataQueue = new Queue(this, 'otelJsonDataQueue', {
      queueName: 'otelJsonDataQueue',
      retentionPeriod: Duration.days(14),
    });

    const collectorApi = new CollectorApi(this, 'collectorApi', {
      apiKeys: [apiKey],
      otelJsonQueue: otelJsonDataQueue,
    });

    new CfnOutput(this, 'apiGatewayUrl', {
      value: collectorApi.api.url,
      exportName: 'apiGatewayUrl',
      description: 'The URL of the API Gateway',
    });
    new CfnOutput(this, 'apiKeyId', {
      value: apiKey.keyId,
      exportName: 'apiKeyId',
      description: 'The API Key ID for authentication of the otel collector api',
    });

    /**
    * Collector Lambda
    */
    new CollectorLambda(this, 'collectorLambda', {
      otelQueue: otelJsonDataQueue,
    });

  }
}
