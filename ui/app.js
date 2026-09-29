// ==============================================================================
// AURA-GCP: Web Console Interactive Controller
// ==============================================================================

const API_BASE = window.location.origin;

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupForms();
  setupControls();
  fetchResources();
  setInterval(fetchResources, 2500);
});

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");
  const title = document.getElementById("currentSectionTitle");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const tab = item.getAttribute("data-tab");

      navItems.forEach(i => i.classList.remove("active"));
      views.forEach(v => v.classList.remove("active"));

      item.classList.add("active");
      const targetView = document.getElementById(`view-${tab}`);
      if (targetView) targetView.classList.add("active");

      const spanText = item.querySelector("span").textContent;
      if (title) title.textContent = spanText;
    });
  });
}

async function fetchResources() {
  try {
    const res = await fetch(`${API_BASE}/_gcp/api/resources`);
    if (!res.ok) return;
    const data = await res.json();
    renderOverview(data);
    renderStorage(data.storage);
    renderFirestore(data.firestore);
    renderPubSub(data.pubsub);
    renderFunctions(data.functions);
    renderSecrets(data.secrets);
    renderKms(data.kms);
    renderLogging(data.logging);
    renderAudit(data.requests);
    renderLiveLogs(data.logs);
  } catch (err) {
    console.warn("Telemetry polling error:", err);
  }
}

function renderOverview(data) {
  const storageCount = (data.storage?.buckets?.length || 0) + (data.storage?.objects?.length || 0);
  const pubsubCount = (data.pubsub?.topics?.length || 0) + (data.pubsub?.subscriptions?.length || 0);
  const firestoreCount = data.firestore?.documents?.length || 0;
  const functionsCount = data.functions?.functions?.length || 0;
  const secretsCount = data.secrets?.length || 0;
  const kmsCount = data.kms?.keyRings?.length || 0;
  const loggingCount = data.logging?.entries?.length || 0;
  const reqCount = data.stats?.totalRequests || 0;

  setText("statStorageCount", storageCount);
  setText("statPubSubCount", pubsubCount);
  setText("statFirestoreCount", firestoreCount);
  setText("statFunctionsCount", functionsCount);
  setText("topbarTotalRequests", reqCount);

  setText("navReqCount", data.requests?.length || 0);
  setText("navStorageCount", data.storage?.buckets?.length || 0);
  setText("navFirestoreCount", firestoreCount);
  setText("navPubSubCount", data.pubsub?.topics?.length || 0);
  setText("navFunctionsCount", functionsCount);
  setText("navSecretsCount", secretsCount);
  setText("navKmsCount", kmsCount);
  setText("navLoggingCount", loggingCount);
}

function renderStorage(storage) {
  const tbody = document.getElementById("storageTableBody");
  const selectTarget = document.getElementById("selectTargetBucket");
  if (!tbody || !storage) return;

  tbody.innerHTML = "";
  if (selectTarget) selectTarget.innerHTML = "";

  (storage.buckets || []).forEach(b => {
    if (selectTarget) {
      const opt = document.createElement("option");
      opt.value = b.name;
      opt.textContent = `gs://${b.name} (${b.location})`;
      selectTarget.appendChild(opt);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">BUCKET</span></td>
      <td><strong>gs://${escapeHtml(b.name)}</strong></td>
      <td>${b.location} · ${b.storageClass}</td>
      <td>${b.timeCreated}</td>
      <td><button class="btn-delete" onclick="deleteBucket('${b.name}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  (storage.objects || []).forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge green">OBJECT</span></td>
      <td>gs://${escapeHtml(o.bucket)}/<strong>${escapeHtml(o.name)}</strong></td>
      <td>${o.size} bytes (${o.contentType})</td>
      <td>${o.timeCreated}</td>
      <td>
        <a href="${API_BASE}/storage/v1/b/${o.bucket}/o/${encodeURIComponent(o.name)}?alt=media" target="_blank" class="btn-sm">Download</a>
        <button class="btn-delete" onclick="deleteObject('${o.bucket}', '${o.name}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFirestore(firestore) {
  const tbody = document.getElementById("firestoreTableBody");
  if (!tbody || !firestore) return;
  tbody.innerHTML = "";

  (firestore.documents || []).forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.collection)}</strong></td>
      <td>${escapeHtml(d.docId)}</td>
      <td><code>${escapeHtml(JSON.stringify(d.fields))}</code></td>
      <td>${d.updateTime}</td>
      <td><button class="btn-delete" onclick="deleteFirestoreDoc('${d.collection}', '${d.docId}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPubSub(pubsub) {
  const tbody = document.getElementById("pubsubTableBody");
  const selectSub = document.getElementById("selectSubTopic");
  const selectPub = document.getElementById("selectPublishTopic");
  if (!tbody || !pubsub) return;

  tbody.innerHTML = "";
  if (selectSub) selectSub.innerHTML = "";
  if (selectPub) selectPub.innerHTML = "";

  (pubsub.topics || []).forEach(t => {
    [selectSub, selectPub].forEach(s => {
      if (s) {
        const opt = document.createElement("option");
        opt.value = t.topicId;
        opt.textContent = t.name;
        s.appendChild(opt);
      }
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">TOPIC</span></td>
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>Topic ID: ${t.topicId}</td>
      <td>-</td>
      <td><button class="btn-delete" onclick="deleteTopic('${t.topicId}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  (pubsub.subscriptions || []).forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge green">SUBSCRIPTION</span></td>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td>Attached: ${escapeHtml(s.topic)}</td>
      <td><strong>${s.messages?.length || 0}</strong> messages in queue</td>
      <td><button class="btn-delete" onclick="deleteSub('${s.subscriptionId}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFunctions(funcData) {
  const tbody = document.getElementById("functionsTableBody");
  if (!tbody || !funcData) return;
  tbody.innerHTML = "";

  (funcData.functions || []).forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(f.functionId)}</strong> (${f.location})</td>
      <td>${f.runtime}</td>
      <td>${f.entryPoint}</td>
      <td><span class="badge green">${f.state}</span></td>
      <td>
        <button class="btn-sm" onclick="callFunction('${f.location}', '${f.functionId}')">Test Call</button>
        <button class="btn-delete" onclick="deleteFunction('${f.location}', '${f.functionId}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSecrets(secrets) {
  const tbody = document.getElementById("secretsTableBody");
  if (!tbody || !secrets) return;
  tbody.innerHTML = "";

  (secrets || []).forEach(s => {
    const latestVersion = s.versions?.length > 0 ? s.versions[s.versions.length - 1] : null;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(s.secretId)}</strong></td>
      <td>${s.project}</td>
      <td><span class="badge blue">${s.versions?.length || 0} Version(s)</span></td>
      <td><code>${latestVersion ? escapeHtml(latestVersion.payload) : 'none'}</code></td>
      <td><button class="btn-delete" onclick="deleteSecret('${s.secretId}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderKms(kms) {
  const tbody = document.getElementById("kmsTableBody");
  if (!tbody || !kms) return;
  tbody.innerHTML = "";

  (kms.keyRings || []).forEach(r => {
    const keyNames = (r.cryptoKeys || []).map(k => k.keyId).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(r.ringId)}</strong></td>
      <td>${r.location}</td>
      <td>${keyNames || 'None'}</td>
      <td>ENCRYPT_DECRYPT</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLogging(logging) {
  const tbody = document.getElementById("loggingTableBody");
  if (!tbody || !logging) return;
  tbody.innerHTML = "";

  (logging.entries || []).slice(0, 50).forEach(e => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${e.timestamp}</td>
      <td><span class="badge ${e.severity === 'ERROR' ? 'red' : 'green'}">${e.severity}</span></td>
      <td>${escapeHtml(e.logName)}</td>
      <td>${escapeHtml(e.textPayload || JSON.stringify(e.jsonPayload))}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAudit(requests) {
  const tbody = document.getElementById("auditLogsBody");
  if (!tbody || !requests) return;
  tbody.innerHTML = "";

  (requests || []).slice(0, 30).forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">${r.method}</span></td>
      <td><strong>${r.service}</strong></td>
      <td>${escapeHtml(r.path)}</td>
      <td><span class="badge ${r.status < 300 ? 'green' : 'red'}">${r.status}</span></td>
      <td>${r.duration}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLiveLogs(logs) {
  const tbody = document.getElementById("liveLogsBody");
  if (!tbody || !logs) return;
  tbody.innerHTML = "";

  (logs || []).slice(0, 20).forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${l.timestamp}</td>
      <td><span class="badge ${l.level === 'warn' ? 'yellow' : (l.level === 'success' ? 'green' : 'blue')}">${l.level}</span></td>
      <td><strong>${l.service}</strong></td>
      <td>${escapeHtml(l.message)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setupForms() {
  // GCS Bucket
  const fBucket = document.getElementById("formCreateBucket");
  if (fBucket) {
    fBucket.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputBucketName").value.trim();
      const location = document.getElementById("selectBucketLocation").value;
      await fetch(`${API_BASE}/storage/v1/b?project=local-project`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, location})
      });
      fBucket.reset();
      fetchResources();
    });
  }

  // GCS Object
  const fObj = document.getElementById("formUploadObject");
  if (fObj) {
    fObj.addEventListener("submit", async (e) => {
      e.preventDefault();
      const b = document.getElementById("selectTargetBucket").value;
      const name = document.getElementById("inputObjectName").value.trim();
      const content = document.getElementById("inputObjectContent").value;
      await fetch(`${API_BASE}/upload/storage/v1/b/${b}/o?name=${encodeURIComponent(name)}`, {
        method: "POST",
        headers: {"Content-Type": "text/plain"},
        body: content
      });
      fObj.reset();
      fetchResources();
    });
  }

  // Firestore Doc
  const fDoc = document.getElementById("formInsertFirestoreDoc");
  if (fDoc) {
    fDoc.addEventListener("submit", async (e) => {
      e.preventDefault();
      const col = document.getElementById("inputFirestoreCollection").value.trim();
      const docId = document.getElementById("inputFirestoreDocId").value.trim() || `doc-${Date.now()}`;
      let fields = {};
      try {
        fields = JSON.parse(document.getElementById("inputFirestoreFields").value);
      } catch (err) {
        fields = {value: {stringValue: document.getElementById("inputFirestoreFields").value}};
      }
      await fetch(`${API_BASE}/v1/projects/local-project/databases/(default)/documents/${col}/${docId}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({fields})
      });
      fDoc.reset();
      fetchResources();
    });
  }

  // PubSub Topic
  const fTopic = document.getElementById("formCreateTopic");
  if (fTopic) {
    fTopic.addEventListener("submit", async (e) => {
      e.preventDefault();
      const topicId = document.getElementById("inputTopicId").value.trim();
      await fetch(`${API_BASE}/v1/projects/local-project/topics/${topicId}`, {method: "PUT"});
      fTopic.reset();
      fetchResources();
    });
  }

  // PubSub Sub
  const fSub = document.getElementById("formCreateSub");
  if (fSub) {
    fSub.addEventListener("submit", async (e) => {
      e.preventDefault();
      const subId = document.getElementById("inputSubId").value.trim();
      const topicId = document.getElementById("selectSubTopic").value;
      await fetch(`${API_BASE}/v1/projects/local-project/subscriptions/${subId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({topic: `projects/local-project/topics/${topicId}`})
      });
      fSub.reset();
      fetchResources();
    });
  }

  // PubSub Publish
  const fPub = document.getElementById("formPublishMessage");
  if (fPub) {
    fPub.addEventListener("submit", async (e) => {
      e.preventDefault();
      const topicId = document.getElementById("selectPublishTopic").value;
      const data = document.getElementById("inputPublishData").value;
      await fetch(`${API_BASE}/v1/projects/local-project/topics/${topicId}:publish`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{data: btoa(data), attributes: {origin: "ui"}}]})
      });
      alert(`Message successfully published and fan-out completed!`);
      fPub.reset();
      fetchResources();
    });
  }

  // Function
  const fFunc = document.getElementById("formRegisterFunction");
  if (fFunc) {
    fFunc.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputFunctionName").value.trim();
      const runtime = document.getElementById("selectFunctionRuntime").value;
      const entryPoint = document.getElementById("inputFunctionEntryPoint").value.trim();
      await fetch(`${API_BASE}/v2/projects/local-project/locations/us-central1/functions?functionId=${name}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({runtime, entryPoint})
      });
      fFunc.reset();
      fetchResources();
    });
  }

  // Secret
  const fSec = document.getElementById("formCreateSecret");
  if (fSec) {
    fSec.addEventListener("submit", async (e) => {
      e.preventDefault();
      const secretId = document.getElementById("inputSecretId").value.trim();
      const val = document.getElementById("inputSecretValue").value.trim();
      await fetch(`${API_BASE}/v1/projects/local-project/secrets?secretId=${secretId}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({replication: {automatic: {}}})
      });
      await fetch(`${API_BASE}/v1/projects/local-project/secrets/${secretId}:addVersion`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({payload: {data: btoa(val)}})
      });
      fSec.reset();
      fetchResources();
    });
  }
}

function setupControls() {
  const btnRefresh = document.getElementById("btnManualRefresh");
  if (btnRefresh) btnRefresh.addEventListener("click", fetchResources);

  const btnClear = document.getElementById("btnClearAuditLogs");
  if (btnClear) {
    btnClear.addEventListener("click", async () => {
      await fetch(`${API_BASE}/_gcp/clear-requests`, {method: "POST"});
      fetchResources();
    });
  }

  const btnReset = document.getElementById("btnResetState");
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      if (confirm("Reset all Aura-GCP resources to clean slate?")) {
        await fetch(`${API_BASE}/_gcp/reset`, {method: "POST"});
        fetchResources();
      }
    });
  }
}

// Global actions
window.deleteBucket = async (b) => {
  if (confirm(`Delete gs://${b}?`)) {
    await fetch(`${API_BASE}/storage/v1/b/${b}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteObject = async (b, o) => {
  if (confirm(`Delete gs://${b}/${o}?`)) {
    await fetch(`${API_BASE}/storage/v1/b/${b}/o/${encodeURIComponent(o)}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteTopic = async (t) => {
  if (confirm(`Delete topic '${t}'?`)) {
    await fetch(`${API_BASE}/v1/projects/local-project/topics/${t}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteSub = async (s) => {
  if (confirm(`Delete subscription '${s}'?`)) {
    await fetch(`${API_BASE}/v1/projects/local-project/subscriptions/${s}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteFirestoreDoc = async (col, docId) => {
  if (confirm(`Delete document ${col}/${docId}?`)) {
    await fetch(`${API_BASE}/v1/projects/local-project/databases/(default)/documents/${col}/${docId}`, {method: "DELETE"});
    fetchResources();
  }
};

window.callFunction = async (loc, fId) => {
  const res = await fetch(`${API_BASE}/v2/projects/local-project/locations/${loc}/functions/${fId}:call`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({testPayload: true})
  });
  const data = await res.json();
  alert(`Function Execution Response:\n${JSON.stringify(data, null, 2)}`);
  fetchResources();
};

window.deleteFunction = async (loc, fId) => {
  if (confirm(`Delete function '${fId}'?`)) {
    await fetch(`${API_BASE}/v2/projects/local-project/locations/${loc}/functions/${fId}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteSecret = async (sId) => {
  if (confirm(`Delete secret '${sId}'?`)) {
    await fetch(`${API_BASE}/v1/projects/local-project/secrets/${sId}`, {method: "DELETE"});
    fetchResources();
  }
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
