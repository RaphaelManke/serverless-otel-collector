import { Duration } from "aws-cdk-lib";
import { RestApi, AuthorizationType, ApiKeySourceType, UsagePlan, ApiKey, AwsIntegration, PassthroughBehavior, Resource } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

export class CollectorApi extends Construct {
  public readonly api: RestApi;
  public readonly queue: Queue;
  constructor(scope: Construct, id: string, props: {
    apiKeys?: ApiKey[];
    otelJsonQueue: Queue;
  }) {
    super(scope, id);
    this.api = new RestApi(this, 'otelWebhookApi', {
      restApiName: 'otelWebhookApi',
      defaultMethodOptions: {
        authorizationType: AuthorizationType.NONE,
      },
      apiKeySourceType: ApiKeySourceType.HEADER,


    });
    this.queue = props.otelJsonQueue
    const usagePlan = new UsagePlan(this, 'UsagePlan', {
      name: 'Usage Plan',
      apiStages: [
        {
          api: this.api,
          stage: this.api.deploymentStage,
        },
      ],
    });
    if (props?.apiKeys) {
      props.apiKeys.forEach((apiKey) => {
        usagePlan.addApiKey(apiKey);
      });
    }
    
    const tracesResource = this.api.root.resourceForPath('/v1/traces');
    const traceMethod = this.setupSqsIntegration(this.queue, tracesResource, "\/v1\/traces");

    const metricsResource = this.api.root.resourceForPath('/v1/metrics');
    const metricsMethod = this.setupSqsIntegration(this.queue, metricsResource, "\/v1\/metrics");

  }
  private setupSqsIntegration(webhookQueue: Queue, tracesResource: Resource, path: string) {
    const integrationRole = new Role(tracesResource, 'integration-role', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });

    webhookQueue.grantSendMessages(integrationRole);

    // add the integration
    const getMessageIntegration = new AwsIntegration({
      service: 'sqs',
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${webhookQueue.queueName}`,
      // region: 'eu-west-1',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: integrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
        },
        requestTemplates: {
          "application/json": `Action=SendMessage&MessageBody=$util.urlEncode($input.body)&MessageAttribute.1.Name=path&MessageAttribute.1.Value.DataType=String&MessageAttribute.1.Value.StringValue=${path}`
        },
        passthroughBehavior: PassthroughBehavior.NEVER,
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": ""
            }
          },
          {
            statusCode: '400',
          },
          {
            statusCode: '500',
          }
        ]
      }
    });

    const traceMethod = tracesResource.addMethod('POST', getMessageIntegration, {
      apiKeyRequired: true,
      methodResponses: [
        {
          statusCode: '200',
        },
        {
          statusCode: '400',
        },
        {
          statusCode: '500',
        }
      ]
    });
    return traceMethod;
  }
}