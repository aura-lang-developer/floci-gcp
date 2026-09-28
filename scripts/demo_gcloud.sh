#!/usr/bin/env bash
# ==============================================================================
# Floci-GCP CLI Showcase Script
# ==============================================================================
# Demonstrates Google Cloud REST APIs against local Floci-GCP (:8080)
# ==============================================================================

set -e

PORT=${1:-8080}
BASE_URL="http://localhost:${PORT}"

export STORAGE_EMULATOR_HOST="${BASE_URL}"
export PUBSUB_EMULATOR_HOST="localhost:${PORT}"
export FIRESTORE_EMULATOR_HOST="localhost:${PORT}"

echo "=================================================================="
echo "🌐 FLOCI-GCP: LOCAL GOOGLE CLOUD DEMONSTRATION"
echo "Endpoint: ${BASE_URL} | Project: local-project"
echo "=================================================================="
echo ""

echo "👉 1. Verify Compute Metadata & OAuth2 Mock Token"
curl -s "${BASE_URL}/computeMetadata/v1/instance/service-accounts/default/token"
echo ""
echo ""

echo "👉 2. Create Cloud Storage Bucket & Upload Object"
curl -s -X POST "${BASE_URL}/storage/v1/b?project=local-project" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo-data-lake","location":"US"}'
echo ""
echo "✓ Bucket gs://demo-data-lake created"

curl -s -X POST "${BASE_URL}/upload/storage/v1/b/demo-data-lake/o?name=sample.txt" \
  -H "Content-Type: text/plain" \
  -d "Hello from local Google Cloud Storage on Floci-GCP!"
echo ""
echo "✓ Object sample.txt uploaded"
echo "Downloading gs://demo-data-lake/sample.txt:"
curl -s "${BASE_URL}/storage/v1/b/demo-data-lake/o/sample.txt?alt=media"
echo ""
echo ""

echo "👉 3. Cloud Pub/Sub: Create Topic, Subscription & Publish"
curl -s -X PUT "${BASE_URL}/v1/projects/local-project/topics/notifications"
echo ""
echo "✓ Topic projects/local-project/topics/notifications created"

curl -s -X PUT "${BASE_URL}/v1/projects/local-project/subscriptions/worker-sub" \
  -H "Content-Type: application/json" \
  -d '{"topic":"projects/local-project/topics/notifications"}'
echo ""
echo "✓ Subscription worker-sub created"

curl -s -X POST "${BASE_URL}/v1/projects/local-project/topics/notifications:publish" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"data":"TmV3IFVzZXIgUmVnaXN0ZXJlZCE="}]}'
echo ""
echo "✓ Message published to topic (auto fan-out to subscriptions)"

echo "Pulling messages from worker-sub:"
curl -s -X POST "${BASE_URL}/v1/projects/local-project/subscriptions/worker-sub:pull" \
  -H "Content-Type: application/json" \
  -d '{"maxMessages":1}'
echo ""
echo ""

echo "👉 4. Cloud Firestore: Insert Document"
curl -s -X PATCH "${BASE_URL}/v1/projects/local-project/databases/(default)/documents/users/usr-2026" \
  -H "Content-Type: application/json" \
  -d '{"fields":{"name":{"stringValue":"Antigravity"},"role":{"stringValue":"AI Engineer"}}}'
echo ""
echo "✓ Document inserted into Firestore"
echo ""

echo "=================================================================="
echo "🎉 DEMO COMPLETE! Inspect resources in Web Console:"
echo "👉 http://localhost:${PORT}/_gcp/ui"
echo "=================================================================="
