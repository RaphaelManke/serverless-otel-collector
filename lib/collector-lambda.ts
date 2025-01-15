import { RemovalPolicy, Duration } from "aws-cdk-lib";
import { LayerVersion, Runtime, Architecture, Tracing } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { lambdaBundlingOptions } from './lambdaBundlingOptions.js';
import { Queue } from "aws-cdk-lib/aws-sqs";

export class CollectorLambda extends Construct {
    private readonly otelQueue: Queue;
    constructor(scope: Construct, id: string, props: {
        otelQueue: Queue;
    }) {
        super(scope, id);
        this.otelQueue = props.otelQueue;

        const otelCollectorLayer = LayerVersion.fromLayerVersionArn(this, 'otelCollectorLayer',
            'arn:aws:lambda:eu-central-1:184161586896:layer:opentelemetry-collector-arm64-0_12_0:1'
        );

        const collectorLambdaLogGroup = new LogGroup(this, 'collectorLambdaLogGroup', {
            logGroupName: '/aws/lambda/collectorLambda',
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.FIVE_DAYS
        });

        const collectorLambda = new NodejsFunction(this, 'collectorLambda', {
            functionName: 'collectorLambda',
            logGroup: collectorLambdaLogGroup,
            entry: "./lambdas/collector/handler.ts",
            bundling: {
                ...lambdaBundlingOptions,
                commandHooks: {
                    beforeBundling: () => [],
                    afterBundling(inputDir: string, outputDir: string): string[] {
                        return [
                            `cp ${__dirname}/../lambdas/collector/collector.yaml ${outputDir}`,
                        ];
                    },
                    beforeInstall: () => []
                }
            },
            environment: {
                OPENTELEMETRY_COLLECTOR_CONFIG_URI: "/var/task/collector.yaml"
            },
            runtime: Runtime.NODEJS_22_X,
            layers: [otelCollectorLayer],
            architecture: Architecture.ARM_64,
            
            memorySize: 1700,
            timeout: Duration.seconds(10),

        });

        collectorLambda.addEventSource(new SqsEventSource(this.otelQueue, {
            reportBatchItemFailures: true,
        }));

    }
}