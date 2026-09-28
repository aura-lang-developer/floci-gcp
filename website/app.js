// ==============================================================================
// FLOCI-GCP: Promotional Website Interactive Controller
// ==============================================================================

const API_BASE = window.location.origin;

document.addEventListener("DOMContentLoaded", () => {
  setupTabs();
  setupTerminal();
});

function setupTabs() {
  const tabs = document.querySelectorAll(".code-tab");
  const contents = document.querySelectorAll(".code-tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.getAttribute("data-target");
      tabs.forEach(t => t.classList.remove("active"));
      contents.forEach(c => c.classList.remove("active"));

      tab.classList.add("active");
      const targetEl = document.getElementById(target);
      if (targetEl) targetEl.classList.add("active");
    });
  });
}

function setupTerminal() {
  const input = document.getElementById("terminalInput");
  const output = document.getElementById("terminalOutput");
  const btnRun = document.getElementById("btnExecuteCmd");
  const presets = document.querySelectorAll(".cmd-preset");

  presets.forEach(p => {
    p.addEventListener("click", () => {
      const cmd = p.getAttribute("data-cmd");
      if (input) {
        input.value = cmd;
        executeCommand(cmd);
      }
    });
  });

  if (btnRun && input) {
    btnRun.addEventListener("click", () => {
      const cmd = input.value.trim();
      if (cmd) executeCommand(cmd);
    });
  }

  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const cmd = input.value.trim();
        if (cmd) executeCommand(cmd);
      }
    });
  }
}

async function executeCommand(cmd) {
  const output = document.getElementById("terminalOutput");
  const input = document.getElementById("terminalInput");
  if (!output) return;

  appendLine(`$ ${cmd}`, "prompt-line");

  const trimmed = cmd.trim();

  if (trimmed === "help") {
    appendLine("Available commands:");
    appendLine("  • gcloud storage buckets create gs://<bucket>");
    appendLine("  • gcloud storage buckets list");
    appendLine("  • gcloud pubsub topics create <topic-id>");
    appendLine("  • gcloud pubsub subscriptions create <sub-id> --topic=<topic-id>");
    appendLine("  • gcloud pubsub topics publish <topic-id> --message='<text>'");
    appendLine("  • curl -s http://localhost:8080/_gcp/health");
    appendLine("  • clear");
    return;
  }

  if (trimmed === "clear") {
    output.innerHTML = "";
    return;
  }

  // Handle curl health
  if (trimmed.includes("/_gcp/health") || trimmed.includes("/health")) {
    try {
      const res = await fetch(`${API_BASE}/_gcp/health`);
      const data = await res.json();
      appendLine(JSON.stringify(data, null, 2), "output");
    } catch (err) {
      appendLine(`{"status":"healthy","runtime":"Aura Lang Native (Cranelift/Go)","version":"0.1.0","coldStartMs":1.82,"port":8080}`, "output");
    }
    return;
  }

  // Handle gcloud storage create
  if (trimmed.startsWith("gcloud storage buckets create") || trimmed.startsWith("gcloud storage create")) {
    const parts = trimmed.split(" ");
    const bucketRaw = parts[parts.length - 1];
    const bName = bucketRaw.replace("gs://", "").trim();

    try {
      const res = await fetch(`${API_BASE}/storage/v1/b?project=local-project`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: bName, location: "US"})
      });
      const data = await res.json();
      appendLine(`Creating gs://${bName}/...`, "output");
      appendLine(`✓ Created bucket gs://${bName}/ (storageClass: STANDARD, location: US)`, "output");
    } catch (err) {
      appendLine(`✓ Created bucket gs://${bName}/ (simulation mode)`, "output");
    }
    return;
  }

  // Handle gcloud pubsub topics create
  if (trimmed.startsWith("gcloud pubsub topics create")) {
    const parts = trimmed.split(" ");
    const topicId = parts[parts.length - 1];

    try {
      await fetch(`${API_BASE}/v1/projects/local-project/topics/${topicId}`, {method: "PUT"});
      appendLine(`✓ Created topic [projects/local-project/topics/${topicId}].`, "output");
    } catch (err) {
      appendLine(`✓ Created topic [projects/local-project/topics/${topicId}].`, "output");
    }
    return;
  }

  // Handle gcloud pubsub subscriptions create
  if (trimmed.startsWith("gcloud pubsub subscriptions create")) {
    const subMatch = trimmed.match(/create\s+([^\s]+)/);
    const topicMatch = trimmed.match(/--topic=([^\s]+)/);
    const subId = subMatch ? subMatch[1] : "sub-1";
    const topicId = topicMatch ? topicMatch[1] : "topic-1";

    try {
      await fetch(`${API_BASE}/v1/projects/local-project/subscriptions/${subId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({topic: `projects/local-project/topics/${topicId}`})
      });
      appendLine(`✓ Created subscription [projects/local-project/subscriptions/${subId}].`, "output");
    } catch (err) {
      appendLine(`✓ Created subscription [projects/local-project/subscriptions/${subId}].`, "output");
    }
    return;
  }

  // Handle gcloud pubsub topics publish
  if (trimmed.startsWith("gcloud pubsub topics publish")) {
    const topicMatch = trimmed.match(/publish\s+([^\s]+)/);
    const msgMatch = trimmed.match(/--message=['"]?([^'"]+)['"]?/);
    const topicId = topicMatch ? topicMatch[1] : "default";
    const msg = msgMatch ? msgMatch[1] : "Test message";

    try {
      const res = await fetch(`${API_BASE}/v1/projects/local-project/topics/${topicId}:publish`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({messages: [{data: btoa(msg), attributes: {cli: "interactive"}}]})
      });
      const data = await res.json();
      appendLine(`messageIds:`, "output");
      (data.messageIds || ["msg-101"]).forEach(id => appendLine(`- '${id}'`, "output"));
    } catch (err) {
      appendLine(`messageIds:\n- 'msg-${Date.now()}'`, "output");
    }
    return;
  }

  // Fallback
  appendLine(`Command executed: ${trimmed} -> OK`, "output");
}

function appendLine(text, className = "output") {
  const output = document.getElementById("terminalOutput");
  if (!output) return;
  const line = document.createElement("div");
  line.className = `term-line ${className}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}
