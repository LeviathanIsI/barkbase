#!/bin/bash
echo "Creating SQS queues for workflow testing..."

awslocal sqs create-queue --queue-name workflow-trigger-queue
awslocal sqs create-queue --queue-name workflow-step-queue
awslocal sqs create-queue --queue-name workflow-dlq

echo "SQS queues created successfully"
awslocal sqs list-queues
