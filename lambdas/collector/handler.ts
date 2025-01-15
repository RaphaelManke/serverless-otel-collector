import {
    BatchProcessor,
    EventType,
    processPartialResponse,
} from '@aws-lambda-powertools/batch';

import type { SQSHandler, SQSRecord } from 'aws-lambda';

const processor = new BatchProcessor(EventType.SQS);

const recordHandler = async (record: SQSRecord): Promise<void> => {
    console.info('Processing item', JSON.stringify(record.messageAttributes));
    const payload = record.body;
    if (payload) {
        const path = record.messageAttributes.path.stringValue || '';
        await sendOtelData(payload,path);
        console.info('Processed item', record.messageId);
    }
};

export const handler: SQSHandler = async (event, context) =>
    processPartialResponse(event, recordHandler, processor, {
        context,
    });

const sendOtelData = async (bodyPayload: any, path: string) => {
    const url = 'http://localhost:4318'+path
    console.log('url', url);
    const resp = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',

        },
        method: 'POST',
        body: bodyPayload
    })

    const body = await resp.text();
    console.log('resp', resp.status, body);
}