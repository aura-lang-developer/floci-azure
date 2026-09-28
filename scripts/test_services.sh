#!/usr/bin/env bash
# ==============================================================================
# Floci-Azure Integration Test Suite
# ==============================================================================
# Tests all 9 emulated Azure services, Auth, and System endpoints
# ==============================================================================

set -e

PORT=${1:-10000}
BASE_URL="http://localhost:${PORT}"

echo "=================================================================="
echo "🧪 RUNNING FLOCI-AZURE INTEGRATION TEST SUITE"
echo "Target Endpoint: ${BASE_URL}"
echo "=================================================================="

pass_count=0
fail_count=0

assert_test() {
  local name="$1"
  local expected="$2"
  local actual="$3"

  if [[ "$actual" == *"$expected"* ]]; then
    echo "  [PASS] $name"
    pass_count=$((pass_count + 1))
  else
    echo "  [FAIL] $name"
    echo "         Expected to contain: $expected"
    echo "         Actual output: $actual"
    fail_count=$((fail_count + 1))
  fi
}

echo ""
echo "--- 1. System & Health Endpoints ---"

RES_HEALTH=$(curl -s "${BASE_URL}/_azure/health")
assert_test "Health Endpoint" '"status":"healthy"' "$RES_HEALTH"

RES_INFO=$(curl -s "${BASE_URL}/_azure/info")
assert_test "Info Endpoint" '"name":"Floci-Azure"' "$RES_INFO"

RES_STATS=$(curl -s "${BASE_URL}/_azure/stats")
assert_test "Stats Endpoint" '"memoryMb":8.5' "$RES_STATS"

RES_RESOURCES=$(curl -s "${BASE_URL}/_azure/api/resources")
assert_test "Unified Resources Endpoint" '"blobs":' "$RES_RESOURCES"

RES_CLEAR_REQ=$(curl -s -X POST "${BASE_URL}/_azure/clear-requests")
assert_test "Clear Requests Endpoint" '"success":true' "$RES_CLEAR_REQ"

RES_UI=$(curl -s "${BASE_URL}/_azure/ui" | head -n 10)
assert_test "Web Console Serving" 'Floci-Azure Portal' "$RES_UI"

RES_SITE=$(curl -s "${BASE_URL}/site" | head -n 10)
assert_test "Promotional Website Serving" 'Floci-Azure' "$RES_SITE"

echo ""
echo "--- 2. Microsoft Entra ID & Azure IMDS Authentication ---"

RES_AUTH_TOKEN=$(curl -s -X POST "${BASE_URL}/oauth2/v2.0/token")
assert_test "Entra ID Bearer Token" 'access_token' "$RES_AUTH_TOKEN"

RES_IMDS_TOKEN=$(curl -s "${BASE_URL}/metadata/identity/oauth2/token")
assert_test "IMDS Managed Identity Token" 'access_token' "$RES_IMDS_TOKEN"

RES_IMDS_INST=$(curl -s "${BASE_URL}/metadata/instance")
assert_test "IMDS Instance Metadata" 'floci-local-node' "$RES_IMDS_INST"

echo ""
echo "--- 3. Azure Blob Storage ---"

# Create Container
RES_BLOB_CC=$(curl -s -X PUT "${BASE_URL}/devstoreaccount1/invoices?restype=container" -w "%{http_code}")
assert_test "Blob Create Container" "201" "$RES_BLOB_CC"

# List Containers
RES_BLOB_LS_CONT=$(curl -s "${BASE_URL}/devstoreaccount1?comp=list")
assert_test "Blob List Containers XML" '<Name>invoices</Name>' "$RES_BLOB_LS_CONT"

# Put BlockBlob
RES_BLOB_PUT=$(curl -s -X PUT "${BASE_URL}/devstoreaccount1/invoices/inv-1001.txt" \
  -H "x-ms-blob-type: BlockBlob" \
  -H "Content-Type: text/plain" \
  -d "Invoice #1001 details for Azure testing" -w "%{http_code}")
assert_test "Blob Put BlockBlob" "201" "$RES_BLOB_PUT"

# Get Blob Content
RES_BLOB_GET=$(curl -s "${BASE_URL}/devstoreaccount1/invoices/inv-1001.txt")
assert_test "Blob Get Content" "Invoice #1001 details" "$RES_BLOB_GET"

# List Blobs
RES_BLOB_LS_BLOBS=$(curl -s "${BASE_URL}/devstoreaccount1/invoices?comp=list")
assert_test "Blob List Blobs XML" '<Name>inv-1001.txt</Name>' "$RES_BLOB_LS_BLOBS"

# Delete Blob
RES_BLOB_DEL=$(curl -s -X DELETE "${BASE_URL}/devstoreaccount1/invoices/inv-1001.txt" -w "%{http_code}")
assert_test "Blob Delete Blob" "202" "$RES_BLOB_DEL"

echo ""
echo "--- 4. Azure Queue Storage ---"

# Create Queue
RES_Q_CREATE=$(curl -s -X PUT "${BASE_URL}/devstoreaccount1/queues/tasks" -w "%{http_code}")
assert_test "Queue Create Queue" "201" "$RES_Q_CREATE"

# List Queues
RES_Q_LIST=$(curl -s "${BASE_URL}/devstoreaccount1/queues")
assert_test "Queue List Queues XML" '<Name>tasks</Name>' "$RES_Q_LIST"

# Enqueue Message
RES_Q_SEND=$(curl -s -X POST "${BASE_URL}/devstoreaccount1/queues/tasks/messages" \
  -d "<QueueMessage><MessageText>ProcessEmailJob</MessageText></QueueMessage>")
assert_test "Queue Enqueue Message XML" '<MessageId>' "$RES_Q_SEND"

# Dequeue Messages
RES_Q_PEEK=$(curl -s "${BASE_URL}/devstoreaccount1/queues/tasks/messages")
assert_test "Queue Dequeue Messages XML" 'ProcessEmailJob' "$RES_Q_PEEK"

echo ""
echo "--- 5. Azure Service Bus ---"

# Create SB Queue
RES_SB_QC=$(curl -s -X PUT "${BASE_URL}/servicebus/queues/customer-events" -w "%{http_code}")
assert_test "ServiceBus Create Queue" "201" "$RES_SB_QC"

# Send Message to SB Queue
RES_SB_QSEND=$(curl -s -X POST "${BASE_URL}/servicebus/queues/customer-events/messages" \
  -H "Content-Type: application/json" \
  -d '{"event":"CustomerCreated","id":"c-1"}' -w "%{http_code}")
assert_test "ServiceBus Send Queue Message" "201" "$RES_SB_QSEND"

# Receive Message from SB Queue
RES_SB_QRECV=$(curl -s -X POST "${BASE_URL}/servicebus/queues/customer-events/messages/head")
assert_test "ServiceBus Receive Queue Message" 'CustomerCreated' "$RES_SB_QRECV"

# Create SB Topic
RES_SB_TC=$(curl -s -X PUT "${BASE_URL}/servicebus/topics/billing-stream" -w "%{http_code}")
assert_test "ServiceBus Create Topic" "201" "$RES_SB_TC"

# Create SB Subscription
RES_SB_SUB=$(curl -s -X PUT "${BASE_URL}/servicebus/topics/billing-stream/subscriptions/audit-worker" -w "%{http_code}")
assert_test "ServiceBus Create Subscription" "201" "$RES_SB_SUB"

# Publish Message to Topic
RES_SB_PUB=$(curl -s -X POST "${BASE_URL}/servicebus/topics/billing-stream/messages" \
  -H "Content-Type: application/json" \
  -d '{"event":"BillingGenerated","amount":450}' -w "%{http_code}")
assert_test "ServiceBus Publish Topic Message" "201" "$RES_SB_PUB"

# Read from Subscription
RES_SB_SUB_RECV=$(curl -s -X POST "${BASE_URL}/servicebus/topics/billing-stream/subscriptions/audit-worker/messages/head")
assert_test "ServiceBus Read Subscription Message" 'BillingGenerated' "$RES_SB_SUB_RECV"

echo ""
echo "--- 6. Azure Cosmos DB & Tables ---"

# Create Cosmos Database
RES_COSMOS_DB=$(curl -s -X POST "${BASE_URL}/dbs" \
  -H "Content-Type: application/json" \
  -d '{"id":"ProductionDB"}')
assert_test "CosmosDB Create Database" 'ProductionDB' "$RES_COSMOS_DB"

# Create Cosmos Collection
RES_COSMOS_COLL=$(curl -s -X POST "${BASE_URL}/dbs/ProductionDB/colls" \
  -H "Content-Type: application/json" \
  -d '{"id":"Clients"}')
assert_test "CosmosDB Create Collection" 'Clients' "$RES_COSMOS_COLL"

# Insert Cosmos Document
RES_COSMOS_DOC=$(curl -s -X POST "${BASE_URL}/dbs/ProductionDB/colls/Clients/docs" \
  -H "Content-Type: application/json" \
  -d '{"id":"cli-500","name":"Acme Corp","tier":"Enterprise"}')
assert_test "CosmosDB Insert Document" 'Acme Corp' "$RES_COSMOS_DOC"

# List Cosmos Documents
RES_COSMOS_DOCS=$(curl -s "${BASE_URL}/dbs/ProductionDB/colls/Clients/docs")
assert_test "CosmosDB List Documents" 'cli-500' "$RES_COSMOS_DOCS"

# Create Azure Table
RES_TBL_CREATE=$(curl -s -X POST "${BASE_URL}/Tables" \
  -H "Content-Type: application/json" \
  -d '{"TableName":"AppSettings"}')
assert_test "AzureTables Create Table" 'AppSettings' "$RES_TBL_CREATE"

# List Azure Tables
RES_TBL_LIST=$(curl -s "${BASE_URL}/Tables")
assert_test "AzureTables List Tables" 'AppSettings' "$RES_TBL_LIST"

echo ""
echo "--- 7. Azure Key Vault ---"

# Set Secret
RES_KV_SET=$(curl -s -X PUT "${BASE_URL}/secrets/redis-password" \
  -H "Content-Type: application/json" \
  -d '{"value":"floci_vault_secret_pass_2026"}')
assert_test "KeyVault Set Secret" 'redis-password' "$RES_KV_SET"

# Get Secret
RES_KV_GET=$(curl -s "${BASE_URL}/secrets/redis-password")
assert_test "KeyVault Get Secret Value" 'floci_vault_secret_pass_2026' "$RES_KV_GET"

# List Secrets
RES_KV_LS=$(curl -s "${BASE_URL}/secrets")
assert_test "KeyVault List Secrets" 'redis-password' "$RES_KV_LS"

# Create Key
RES_KV_KEY=$(curl -s -X POST "${BASE_URL}/keys/app-key/create" \
  -H "Content-Type: application/json" \
  -d '{"kty":"RSA","key_size":2048}')
assert_test "KeyVault Create Key" 'app-key' "$RES_KV_KEY"

# Encrypt
RES_KV_ENC=$(curl -s -X POST "${BASE_URL}/keys/app-key/encrypt" \
  -H "Content-Type: application/json" \
  -d '{"value":"plain-data"}')
assert_test "KeyVault Encrypt" 'value' "$RES_KV_ENC"

# Decrypt
RES_KV_DEC=$(curl -s -X POST "${BASE_URL}/keys/app-key/decrypt" \
  -H "Content-Type: application/json" \
  -d '{"value":"enc_plain-data_azure_vault_cipher"}')
assert_test "KeyVault Decrypt" 'plain-data' "$RES_KV_DEC"

echo ""
echo "--- 8. Azure Functions ---"

# Register Function
RES_FN_REG=$(curl -s -X POST "${BASE_URL}/admin/functions/InvoiceWorker" \
  -H "Content-Type: application/json" \
  -d '{"appName":"billing-app","runtime":"dotnet-isolated"}')
assert_test "Functions Register Function" 'InvoiceWorker' "$RES_FN_REG"

# List Functions
RES_FN_LS=$(curl -s "${BASE_URL}/admin/functions")
assert_test "Functions List Functions" 'InvoiceWorker' "$RES_FN_LS"

# Invoke Function
RES_FN_RUN=$(curl -s -X POST "${BASE_URL}/api/InvoiceWorker" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":9901}')
assert_test "Functions Execute Function" 'Executed Azure Function' "$RES_FN_RUN"

echo ""
echo "--- 9. Azure Monitor & Application Insights ---"

# Ingest Telemetry
RES_MON_TRACK=$(curl -s -X POST "${BASE_URL}/v2/track" \
  -H "Content-Type: application/json" \
  -d '{"name":"UserLoginEvent","iKey":"key-123","data":{"user":"bob"}}')
assert_test "Monitor Track Telemetry" 'itemsAccepted' "$RES_MON_TRACK"

# Query Telemetry
RES_MON_LOGS=$(curl -s "${BASE_URL}/monitor/logs")
assert_test "Monitor Query Logs" 'UserLoginEvent' "$RES_MON_LOGS"

echo ""
echo "=================================================================="
echo "SUMMARY: Passed: ${pass_count} | Failed: ${fail_count}"
echo "=================================================================="

if [ $fail_count -eq 0 ]; then
  echo "🎉 ALL ${pass_count} TESTS PASSED FLAWLESSLY ON FLOCI-AZURE!"
  exit 0
else
  echo "❌ SOME TESTS FAILED!"
  exit 1
fi
