#!/usr/bin/env bash
# ==============================================================================
# Floci-Azure CLI Showcase Script
# ==============================================================================
# Demonstrates Microsoft Azure REST APIs against local Floci-Azure (:10000)
# ==============================================================================

set -e

PORT=${1:-10000}
BASE_URL="http://localhost:${PORT}"

export AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=mock;BlobEndpoint=${BASE_URL}/devstoreaccount1;QueueEndpoint=${BASE_URL}/devstoreaccount1;TableEndpoint=${BASE_URL}/devstoreaccount1;"

echo "=================================================================="
echo "☁️  FLOCI-AZURE: LOCAL MICROSOFT AZURE DEMONSTRATION"
echo "Endpoint: ${BASE_URL} | Account: devstoreaccount1"
echo "=================================================================="
echo ""

echo "👉 1. Verify Microsoft Entra ID Token & IMDS Metadata"
curl -s -X POST "${BASE_URL}/oauth2/v2.0/token"
echo ""
echo ""

echo "👉 2. Create Azure Blob Container & Upload BlockBlob"
curl -s -X PUT "${BASE_URL}/devstoreaccount1/demo-assets?restype=container"
echo "✓ Container 'demo-assets' created"

curl -s -X PUT "${BASE_URL}/devstoreaccount1/demo-assets/hello.txt" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: text/plain" \
  -d "Hello from Azure Blob Storage on Floci-Azure!"
echo "✓ BlockBlob 'hello.txt' uploaded to 'demo-assets'"

echo "Content retrieved from blob:"
curl -s "${BASE_URL}/devstoreaccount1/demo-assets/hello.txt"
echo ""
echo ""

echo "👉 3. Azure Queue Storage: Enqueue & Peek Message"
curl -s -X PUT "${BASE_URL}/devstoreaccount1/queues/email-queue"
echo "✓ Queue 'email-queue' created"

curl -s -X POST "${BASE_URL}/devstoreaccount1/queues/email-queue/messages" \
  -d "<QueueMessage><MessageText>SendWelcomeEmail#9021</MessageText></QueueMessage>" > /dev/null
echo "✓ Message enqueued into 'email-queue'"

echo "Peeking message in 'email-queue':"
curl -s "${BASE_URL}/devstoreaccount1/queues/email-queue/messages"
echo ""
echo ""

echo "👉 4. Azure Service Bus: Publish to Topic with Auto Fan-out"
curl -s -X PUT "${BASE_URL}/servicebus/topics/order-stream"
curl -s -X PUT "${BASE_URL}/servicebus/topics/order-stream/subscriptions/shipping-service"
curl -s -X POST "${BASE_URL}/servicebus/topics/order-stream/messages" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ord-9988","status":"Paid"}'
echo "✓ Message published to topic 'order-stream' and fanned out to 'shipping-service'"

echo "Receiving message from 'shipping-service' subscription:"
curl -s -X POST "${BASE_URL}/servicebus/topics/order-stream/subscriptions/shipping-service/messages/head"
echo ""
echo ""

echo "👉 5. Azure Key Vault: Save Secret"
curl -s -X PUT "${BASE_URL}/secrets/sql-admin-pass" \
  -H "Content-Type: application/json" \
  -d '{"value":"P@ssw0rdAzure2026!"}'
echo ""
echo "✓ Secret saved in local Azure Key Vault"
echo ""

echo "=================================================================="
echo "🎉 DEMO COMPLETE! Inspect resources in Azure Portal Web Console:"
echo "👉 http://localhost:${PORT}/_azure/ui"
echo "=================================================================="
