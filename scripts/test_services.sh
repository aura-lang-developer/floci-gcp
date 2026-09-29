#!/usr/bin/env bash
# ==============================================================================
# Aura-GCP Integration Test Suite
# ==============================================================================
# Tests all 8 emulated Google Cloud services, Auth, and System endpoints
# ==============================================================================

set -e

PORT=${1:-8080}
BASE_URL="http://localhost:${PORT}"

echo "=================================================================="
echo "🧪 RUNNING AURA-GCP INTEGRATION TEST SUITE"
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

RES_HEALTH=$(curl -s "${BASE_URL}/_gcp/health")
assert_test "Health Endpoint" '"status":"healthy"' "$RES_HEALTH"

RES_INFO=$(curl -s "${BASE_URL}/_gcp/info")
assert_test "Info Endpoint" '"name":"Aura-GCP"' "$RES_INFO"

RES_STATS=$(curl -s "${BASE_URL}/_gcp/stats")
assert_test "Stats Endpoint" '"memoryMb":8.2' "$RES_STATS"

RES_RESOURCES=$(curl -s "${BASE_URL}/_gcp/api/resources")
assert_test "Unified Resources Endpoint" '"storage":' "$RES_RESOURCES"

RES_CLEAR_REQ=$(curl -s -X POST "${BASE_URL}/_gcp/clear-requests")
assert_test "Clear Requests Endpoint" '"success":true' "$RES_CLEAR_REQ"

RES_UI=$(curl -s "${BASE_URL}/_gcp/ui" | head -n 10)
assert_test "Web Console Serving" 'Aura-GCP Console' "$RES_UI"

RES_SITE=$(curl -s "${BASE_URL}/site" | head -n 10)
assert_test "Promotional Website Serving" 'Aura-GCP' "$RES_SITE"

echo ""
echo "--- 2. OAuth2 & Compute Metadata Server ---"

RES_OAUTH=$(curl -s -X POST "${BASE_URL}/oauth2/v4/token")
assert_test "OAuth2 Mock Token" 'access_token' "$RES_OAUTH"

RES_META_PROJ=$(curl -s "${BASE_URL}/computeMetadata/v1/project/project-id")
assert_test "Metadata Project ID" 'local-project' "$RES_META_PROJ"

RES_META_TOKEN=$(curl -s "${BASE_URL}/computeMetadata/v1/instance/service-accounts/default/token")
assert_test "Metadata Service Account Token" 'ya29.' "$RES_META_TOKEN"

echo ""
echo "--- 3. Google Cloud Storage (GCS) ---"

# Create Bucket
RES_GCS_MB=$(curl -s -X POST "${BASE_URL}/storage/v1/b?project=local-project" \
  -H "Content-Type: application/json" \
  -d '{"name":"prod-assets","location":"US"}')
assert_test "GCS Create Bucket" '"name":"prod-assets"' "$RES_GCS_MB"

# List Buckets
RES_GCS_LS=$(curl -s "${BASE_URL}/storage/v1/b?project=local-project")
assert_test "GCS List Buckets" 'prod-assets' "$RES_GCS_LS"

# Upload Object
RES_GCS_PUT=$(curl -s -X POST "${BASE_URL}/upload/storage/v1/b/prod-assets/o?name=config.json" \
  -H "Content-Type: application/json" \
  -d '{"appName":"aura-gcp","version":"1.0"}')
assert_test "GCS Upload Object" '"name":"config.json"' "$RES_GCS_PUT"

# Get Object Metadata
RES_GCS_META=$(curl -s "${BASE_URL}/storage/v1/b/prod-assets/o/config.json")
assert_test "GCS Get Object Metadata" '"bucket":"prod-assets"' "$RES_GCS_META"

# Download Object Content
RES_GCS_GET=$(curl -s "${BASE_URL}/storage/v1/b/prod-assets/o/config.json?alt=media")
assert_test "GCS Download Object Media" '"appName":"aura-gcp"' "$RES_GCS_GET"

# List Objects
RES_GCS_OBJS=$(curl -s "${BASE_URL}/storage/v1/b/prod-assets/o")
assert_test "GCS List Objects" 'config.json' "$RES_GCS_OBJS"

echo ""
echo "--- 4. Cloud Pub/Sub ---"

# Create Topic
RES_PS_TOPIC=$(curl -s -X PUT "${BASE_URL}/v1/projects/local-project/topics/order-events")
assert_test "PubSub Create Topic" 'projects/local-project/topics/order-events' "$RES_PS_TOPIC"

# List Topics
RES_PS_LS_TOPICS=$(curl -s "${BASE_URL}/v1/projects/local-project/topics")
assert_test "PubSub List Topics" 'order-events' "$RES_PS_LS_TOPICS"

# Create Subscription
RES_PS_SUB=$(curl -s -X PUT "${BASE_URL}/v1/projects/local-project/subscriptions/order-sub" \
  -H "Content-Type: application/json" \
  -d '{"topic":"projects/local-project/topics/order-events"}')
assert_test "PubSub Create Subscription" 'projects/local-project/subscriptions/order-sub' "$RES_PS_SUB"

# Publish Message
RES_PS_PUB=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/topics/order-events:publish" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"data":"T3JkZXIgIzg4OTkgY3JlYXRlZA=="}]}')
assert_test "PubSub Publish Message" 'messageIds' "$RES_PS_PUB"

# Pull Messages
RES_PS_PULL=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/subscriptions/order-sub:pull" \
  -H "Content-Type: application/json" \
  -d '{"maxMessages":5}')
assert_test "PubSub Pull Messages" 'receivedMessages' "$RES_PS_PULL"

# Acknowledge Messages
RES_PS_ACK=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/subscriptions/order-sub:acknowledge" \
  -H "Content-Type: application/json" \
  -d '{"ackIds":["ack-test-1"]}')
assert_test "PubSub Acknowledge Message" '{}' "$RES_PS_ACK"

echo ""
echo "--- 5. Cloud Firestore ---"

# Create / Update Document
RES_FS_PUT=$(curl -s -X PATCH "${BASE_URL}/v1/projects/local-project/databases/(default)/documents/customers/cust-101" \
  -H "Content-Type: application/json" \
  -d '{"fields":{"name":{"stringValue":"Sarah Connor"},"tier":{"stringValue":"Enterprise"}}}')
assert_test "Firestore Upsert Document" 'cust-101' "$RES_FS_PUT"

# Get Document
RES_FS_GET=$(curl -s "${BASE_URL}/v1/projects/local-project/databases/(default)/documents/customers/cust-101")
assert_test "Firestore Get Document" 'Sarah Connor' "$RES_FS_GET"

# List Documents in Collection
RES_FS_LIST=$(curl -s "${BASE_URL}/v1/projects/local-project/databases/(default)/documents/customers")
assert_test "Firestore List Documents" 'cust-101' "$RES_FS_LIST"

# Run Query
RES_FS_QUERY=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/databases/(default)/documents:runQuery")
assert_test "Firestore Run Query" 'document' "$RES_FS_QUERY"

echo ""
echo "--- 6. Secret Manager ---"

# Create Secret
RES_SEC_CREATE=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/secrets?secretId=database-password" \
  -H "Content-Type: application/json" \
  -d '{"replication":{"automatic":{}}}')
assert_test "SecretManager Create Secret" 'database-password' "$RES_SEC_CREATE"

# Add Secret Version
RES_SEC_ADD=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/secrets/database-password:addVersion" \
  -H "Content-Type: application/json" \
  -d '{"payload":{"data":"c3VwZXJfc2VjcmV0X3Bhc3N3b3JkXzIwMjY="}}')
assert_test "SecretManager Add Version" 'versions/1' "$RES_SEC_ADD"

# Access Secret Version
RES_SEC_ACCESS=$(curl -s "${BASE_URL}/v1/projects/local-project/secrets/database-password/versions/latest:access")
assert_test "SecretManager Access Version" 'c3VwZXJfc2VjcmV0X3Bhc3N3b3JkXzIwMjY=' "$RES_SEC_ACCESS"

echo ""
echo "--- 7. Cloud Functions v2 ---"

# Register Function
RES_FN_CREATE=$(curl -s -X POST "${BASE_URL}/v2/projects/local-project/locations/us-central1/functions?functionId=invoiceWorker" \
  -H "Content-Type: application/json" \
  -d '{"runtime":"nodejs20","entryPoint":"processInvoice"}')
assert_test "CloudFunctions Create Function" 'invoiceWorker' "$RES_FN_CREATE"

# Get Function
RES_FN_GET=$(curl -s "${BASE_URL}/v2/projects/local-project/locations/us-central1/functions/invoiceWorker")
assert_test "CloudFunctions Get Function" '"state":"ACTIVE"' "$RES_FN_GET"

# Call Function
RES_FN_CALL=$(curl -s -X POST "${BASE_URL}/v2/projects/local-project/locations/us-central1/functions/invoiceWorker:call" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 9942}')
assert_test "CloudFunctions Call Function" 'Execution successful' "$RES_FN_CALL"

echo ""
echo "--- 8. Cloud KMS ---"

# Create KeyRing
RES_KMS_RING=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/locations/us-central1/keyRings?keyRingId=app-keyring")
assert_test "KMS Create KeyRing" 'app-keyring' "$RES_KMS_RING"

# Create CryptoKey
RES_KMS_KEY=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/locations/us-central1/keyRings/app-keyring/cryptoKeys?cryptoKeyId=primary-key" \
  -H "Content-Type: application/json" \
  -d '{"purpose":"ENCRYPT_DECRYPT"}')
assert_test "KMS Create CryptoKey" 'primary-key' "$RES_KMS_KEY"

# Encrypt
RES_KMS_ENC=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/locations/us-central1/keyRings/app-keyring/cryptoKeys/primary-key:encrypt" \
  -H "Content-Type: application/json" \
  -d '{"plaintext":"my-token"}')
assert_test "KMS Encrypt" 'ciphertext' "$RES_KMS_ENC"

# Decrypt
RES_KMS_DEC=$(curl -s -X POST "${BASE_URL}/v1/projects/local-project/locations/us-central1/keyRings/app-keyring/cryptoKeys/primary-key:decrypt" \
  -H "Content-Type: application/json" \
  -d '{"ciphertext":"enc_my-token_encrypted_mock"}')
assert_test "KMS Decrypt" 'my-token' "$RES_KMS_DEC"

echo ""
echo "--- 9. Cloud Logging ---"

# Write Log Entries
RES_LOG_WRITE=$(curl -s -X POST "${BASE_URL}/v2/entries:write" \
  -H "Content-Type: application/json" \
  -d '{"entries":[{"logName":"projects/local-project/logs/app","textPayload":"User authenticated"}]}')
assert_test "Logging Write Entries" '{}' "$RES_LOG_WRITE"

# List Log Entries
RES_LOG_LIST=$(curl -s -X POST "${BASE_URL}/v2/entries:list")
assert_test "Logging List Entries" 'User authenticated' "$RES_LOG_LIST"

echo ""
echo "=================================================================="
echo "SUMMARY: Passed: ${pass_count} | Failed: ${fail_count}"
echo "=================================================================="

if [ $fail_count -eq 0 ]; then
  echo "🎉 ALL ${pass_count} TESTS PASSED FLAWLESSLY ON AURA-GCP!"
  exit 0
else
  echo "❌ SOME TESTS FAILED!"
  exit 1
fi
