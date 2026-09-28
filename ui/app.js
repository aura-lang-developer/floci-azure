// ==============================================================================
// FLOCI-AZURE: Web Console Interactive Controller
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
    const res = await fetch(`${API_BASE}/_azure/api/resources`);
    if (!res.ok) return;
    const data = await res.json();
    renderOverview(data);
    renderBlobs(data.blobs);
    renderCosmos(data.cosmos, data.tables);
    renderQueues(data.queues);
    renderServiceBus(data.serviceBus);
    renderKeyVault(data.keyVault);
    renderFunctions(data.functions);
    renderMonitor(data.monitor);
    renderAudit(data.requests);
    renderLiveLogs(data.logs);
  } catch (err) {
    console.warn("Telemetry polling error:", err);
  }
}

function renderOverview(data) {
  const blobCount = (data.blobs?.containers?.length || 0) + (data.blobs?.items?.length || 0);
  const cosmosCount = (data.cosmos?.databases?.length || 0) + (data.tables?.length || 0);
  const msgCount = (data.queues?.length || 0) + (data.serviceBus?.queues?.length || 0) + (data.serviceBus?.topics?.length || 0);
  const kvCount = (data.keyVault?.secrets?.length || 0) + (data.keyVault?.keys?.length || 0);
  const funcCount = data.functions?.length || 0;
  const reqCount = data.stats?.totalRequests || 0;

  setText("statBlobCount", blobCount);
  setText("statCosmosCount", cosmosCount);
  setText("statMsgCount", msgCount);
  setText("statKvCount", kvCount);
  setText("topbarTotalRequests", reqCount);

  setText("navReqCount", data.requests?.length || 0);
  setText("navBlobCount", data.blobs?.containers?.length || 0);
  setText("navCosmosCount", cosmosCount);
  setText("navQueueCount", data.queues?.length || 0);
  setText("navSbCount", (data.serviceBus?.topics?.length || 0) + (data.serviceBus?.queues?.length || 0));
  setText("navKvCount", data.keyVault?.secrets?.length || 0);
  setText("navFuncCount", funcCount);
  setText("navMonitorCount", data.monitor?.length || 0);
}

function renderBlobs(blobs) {
  const tbody = document.getElementById("blobTableBody");
  const selectTarget = document.getElementById("selectTargetContainer");
  if (!tbody || !blobs) return;

  tbody.innerHTML = "";
  if (selectTarget) selectTarget.innerHTML = "";

  (blobs.containers || []).forEach(c => {
    if (selectTarget) {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      selectTarget.appendChild(opt);
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">CONTAINER</span></td>
      <td><strong>${escapeHtml(c.name)}</strong></td>
      <td>${c.account} · ${c.publicAccess}</td>
      <td>${c.lastModified}</td>
      <td><button class="btn-delete" onclick="deleteContainer('${c.name}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  (blobs.items || []).forEach(b => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge green">BLOCKBLOB</span></td>
      <td>${escapeHtml(b.container)}/<strong>${escapeHtml(b.name)}</strong></td>
      <td>${b.size} bytes (${b.contentType})</td>
      <td>${b.lastModified}</td>
      <td>
        <a href="${API_BASE}/devstoreaccount1/${b.container}/${encodeURIComponent(b.name)}" target="_blank" class="btn-sm">Download</a>
        <button class="btn-delete" onclick="deleteBlob('${b.container}', '${b.name}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCosmos(cosmos, tables) {
  const tbody = document.getElementById("cosmosTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  (cosmos?.databases || []).forEach(db => {
    (db.collections || []).forEach(coll => {
      (coll.documents || []).forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(db.id)}</strong></td>
          <td>${escapeHtml(coll.id)}</td>
          <td><code>${escapeHtml(d.id)}</code></td>
          <td><code>${escapeHtml(JSON.stringify(d))}</code></td>
        `;
        tbody.appendChild(tr);
      });
    });
  });

  (tables || []).forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">TABLE STORAGE</span></td>
      <td>${escapeHtml(t.name)}</td>
      <td>${t.rows?.length || 0} rows</td>
      <td><code>${escapeHtml(JSON.stringify(t.rows))}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderQueues(queues) {
  const tbody = document.getElementById("queueTableBody");
  if (!tbody || !queues) return;
  tbody.innerHTML = "";

  (queues || []).forEach(q => {
    (q.messages || []).forEach(m => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(q.name)}</strong></td>
        <td><code>${escapeHtml(m.messageId)}</code></td>
        <td>${escapeHtml(m.messageText)}</td>
        <td><button class="btn-delete" onclick="deleteQueueMsg('${q.name}', '${m.messageId}')">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });
  });
}

function renderServiceBus(sb) {
  const tbody = document.getElementById("sbTableBody");
  const selectSubTopic = document.getElementById("selectSbSubTopic");
  const selectPubTopic = document.getElementById("selectPublishSbTopic");
  if (!tbody || !sb) return;

  tbody.innerHTML = "";
  if (selectSubTopic) selectSubTopic.innerHTML = "";
  if (selectPubTopic) selectPubTopic.innerHTML = "";

  (sb.topics || []).forEach(t => {
    [selectSubTopic, selectPubTopic].forEach(s => {
      if (s) {
        const opt = document.createElement("option");
        opt.value = t.name;
        opt.textContent = t.name;
        s.appendChild(opt);
      }
    });

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">TOPIC</span></td>
      <td><strong>${escapeHtml(t.name)}</strong></td>
      <td>${t.subscriptions?.length || 0} Subscriptions</td>
      <td>-</td>
    `;
    tbody.appendChild(tr);

    (t.subscriptions || []).forEach(sub => {
      const subTr = document.createElement("tr");
      subTr.innerHTML = `
        <td><span class="badge green">SUBSCRIPTION</span></td>
        <td>${escapeHtml(t.name)} / <strong>${escapeHtml(sub.name)}</strong></td>
        <td>Attached to ${escapeHtml(t.name)}</td>
        <td><strong>${sub.messages?.length || 0}</strong> messages in queue</td>
      `;
      tbody.appendChild(subTr);
    });
  });

  (sb.queues || []).forEach(q => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">SB QUEUE</span></td>
      <td><strong>${escapeHtml(q.name)}</strong></td>
      <td>Local Service Bus Queue</td>
      <td>${q.messages?.length || 0} messages</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderKeyVault(kv) {
  const tbody = document.getElementById("kvTableBody");
  if (!tbody || !kv) return;
  tbody.innerHTML = "";

  (kv.secrets || []).forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge green">SECRET</span></td>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td><code>${escapeHtml(s.value)}</code> (${s.versions?.length || 1} versions)</td>
      <td><button class="btn-delete" onclick="deleteKvSecret('${s.name}')">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });

  (kv.keys || []).forEach(k => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="badge blue">CRYPTO KEY</span></td>
      <td><strong>${escapeHtml(k.name)}</strong></td>
      <td>Type: ${k.keyType} · ${k.keySize} bits</td>
      <td>-</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderFunctions(funcs) {
  const tbody = document.getElementById("functionsTableBody");
  if (!tbody || !funcs) return;
  tbody.innerHTML = "";

  (funcs || []).forEach(f => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(f.name)}</strong></td>
      <td>${f.runtime}</td>
      <td><span class="badge blue">${f.invocationsCount || 0} calls</span></td>
      <td><span class="badge green">${f.state}</span></td>
      <td>
        <button class="btn-sm" onclick="callFunction('${f.name}')">Execute</button>
        <button class="btn-delete" onclick="deleteFunction('${f.name}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderMonitor(monitor) {
  const tbody = document.getElementById("monitorTableBody");
  if (!tbody || !monitor) return;
  tbody.innerHTML = "";

  (monitor || []).slice(0, 30).forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.time}</td>
      <td><span class="badge blue">${escapeHtml(m.name)}</span></td>
      <td><code>${escapeHtml(m.iKey)}</code></td>
      <td><code>${escapeHtml(JSON.stringify(m.data))}</code></td>
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
  // Container
  const fContainer = document.getElementById("formCreateContainer");
  if (fContainer) {
    fContainer.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputContainerName").value.trim();
      await fetch(`${API_BASE}/devstoreaccount1/${name}?restype=container`, {method: "PUT"});
      fContainer.reset();
      fetchResources();
    });
  }

  // Blob
  const fBlob = document.getElementById("formUploadBlob");
  if (fBlob) {
    fBlob.addEventListener("submit", async (e) => {
      e.preventDefault();
      const container = document.getElementById("selectTargetContainer").value;
      const name = document.getElementById("inputBlobName").value.trim();
      const content = document.getElementById("inputBlobContent").value;
      await fetch(`${API_BASE}/devstoreaccount1/${container}/${encodeURIComponent(name)}`, {
        method: "PUT",
        headers: {"x-ms-blob-type": "BlockBlob", "Content-Type": "text/plain"},
        body: content
      });
      fBlob.reset();
      fetchResources();
    });
  }

  // Cosmos Doc
  const fCosmos = document.getElementById("formCreateCosmosDoc");
  if (fCosmos) {
    fCosmos.addEventListener("submit", async (e) => {
      e.preventDefault();
      const db = document.getElementById("inputCosmosDb").value.trim();
      const coll = document.getElementById("inputCosmosColl").value.trim();
      let doc = {};
      try {
        doc = JSON.parse(document.getElementById("inputCosmosDocJson").value);
      } catch (err) {
        doc = {content: document.getElementById("inputCosmosDocJson").value};
      }
      await fetch(`${API_BASE}/dbs/${db}/colls/${coll}/docs`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(doc)
      });
      fCosmos.reset();
      fetchResources();
    });
  }

  // Table
  const fTable = document.getElementById("formCreateTable");
  if (fTable) {
    fTable.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tbl = document.getElementById("inputTableName").value.trim();
      await fetch(`${API_BASE}/Tables`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({TableName: tbl})
      });
      fTable.reset();
      fetchResources();
    });
  }

  // Queue Msg
  const fQueue = document.getElementById("formSendQueueMsg");
  if (fQueue) {
    fQueue.addEventListener("submit", async (e) => {
      e.preventDefault();
      const q = document.getElementById("inputQueueName").value.trim();
      const txt = document.getElementById("inputQueueMsgText").value;
      await fetch(`${API_BASE}/devstoreaccount1/queues/${q}/messages`, {
        method: "POST",
        headers: {"Content-Type": "application/xml"},
        body: `<QueueMessage><MessageText>${txt}</MessageText></QueueMessage>`
      });
      fQueue.reset();
      fetchResources();
    });
  }

  // SB Topic
  const fSbTopic = document.getElementById("formCreateSbTopic");
  if (fSbTopic) {
    fSbTopic.addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = document.getElementById("inputSbTopicName").value.trim();
      await fetch(`${API_BASE}/servicebus/topics/${t}`, {method: "PUT"});
      fSbTopic.reset();
      fetchResources();
    });
  }

  // SB Sub
  const fSbSub = document.getElementById("formCreateSbSub");
  if (fSbSub) {
    fSbSub.addEventListener("submit", async (e) => {
      e.preventDefault();
      const s = document.getElementById("inputSbSubName").value.trim();
      const t = document.getElementById("selectSbSubTopic").value;
      await fetch(`${API_BASE}/servicebus/topics/${t}/subscriptions/${s}`, {method: "PUT"});
      fSbSub.reset();
      fetchResources();
    });
  }

  // SB Publish
  const fSbPub = document.getElementById("formPublishSbMsg");
  if (fSbPub) {
    fSbPub.addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = document.getElementById("selectPublishSbTopic").value;
      const msg = document.getElementById("inputPublishSbMsgText").value;
      await fetch(`${API_BASE}/servicebus/topics/${t}/messages`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: msg
      });
      alert("Message published to Service Bus topic with auto fan-out!");
      fSbPub.reset();
      fetchResources();
    });
  }

  // Key Vault Secret
  const fKvSec = document.getElementById("formSetKvSecret");
  if (fKvSec) {
    fKvSec.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputKvSecretName").value.trim();
      const val = document.getElementById("inputKvSecretValue").value.trim();
      await fetch(`${API_BASE}/secrets/${name}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({value: val})
      });
      fKvSec.reset();
      fetchResources();
    });
  }

  // Key Vault Key
  const fKvKey = document.getElementById("formCreateKvKey");
  if (fKvKey) {
    fKvKey.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("inputKvKeyName").value.trim();
      await fetch(`${API_BASE}/keys/${name}/create`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({kty: "RSA", key_size: 2048})
      });
      fKvKey.reset();
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
      await fetch(`${API_BASE}/admin/functions/${name}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({runtime, entryPoint})
      });
      fFunc.reset();
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
      await fetch(`${API_BASE}/_azure/clear-requests`, {method: "POST"});
      fetchResources();
    });
  }

  const btnReset = document.getElementById("btnResetState");
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      if (confirm("Reset all Floci-Azure resources to clean slate?")) {
        await fetch(`${API_BASE}/_azure/reset`, {method: "POST"});
        fetchResources();
      }
    });
  }
}

window.deleteContainer = async (c) => {
  if (confirm(`Delete container '${c}'?`)) {
    await fetch(`${API_BASE}/devstoreaccount1/${c}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteBlob = async (c, b) => {
  if (confirm(`Delete blob '${c}/${b}'?`)) {
    await fetch(`${API_BASE}/devstoreaccount1/${c}/${encodeURIComponent(b)}`, {method: "DELETE"});
    fetchResources();
  }
};

window.deleteQueueMsg = async (q, mId) => {
  await fetch(`${API_BASE}/devstoreaccount1/queues/${q}/messages/${mId}`, {method: "DELETE"});
  fetchResources();
};

window.deleteKvSecret = async (s) => {
  if (confirm(`Delete secret '${s}'?`)) {
    await fetch(`${API_BASE}/secrets/${s}`, {method: "DELETE"});
    fetchResources();
  }
};

window.callFunction = async (f) => {
  const res = await fetch(`${API_BASE}/api/${f}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({trigger: "manual-ui"})
  });
  const data = await res.json();
  alert(`Function Execution Response:\n${JSON.stringify(data, null, 2)}`);
  fetchResources();
};

window.deleteFunction = async (f) => {
  if (confirm(`Delete function '${f}'?`)) {
    await fetch(`${API_BASE}/admin/functions/${f}`, {method: "DELETE"});
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
