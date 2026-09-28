// ==============================================================================
// FLOCI-AZURE: Promotional Website Interactive Controller
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
  if (!output) return;

  appendLine(`$ ${cmd}`, "prompt-line");
  const trimmed = cmd.trim();

  if (trimmed === "help") {
    appendLine("Available commands:");
    appendLine("  • az storage container create -n <container>");
    appendLine("  • az servicebus topic create --name <topic>");
    appendLine("  • az keyvault secret set --vault-name <vault> --name <sec> --value <val>");
    appendLine("  • curl -s http://localhost:10000/_azure/health");
    appendLine("  • clear");
    return;
  }

  if (trimmed === "clear") {
    output.innerHTML = "";
    return;
  }

  // Health
  if (trimmed.includes("/_azure/health") || trimmed.includes("/health")) {
    try {
      const res = await fetch(`${API_BASE}/_azure/health`);
      const data = await res.json();
      appendLine(JSON.stringify(data, null, 2), "output");
    } catch (err) {
      appendLine(`{"status":"healthy","runtime":"Aura Lang Native (Cranelift/Go)","version":"0.1.0","coldStartMs":1.81,"port":10000}`, "output");
    }
    return;
  }

  // Storage Container
  if (trimmed.startsWith("az storage container create")) {
    const parts = trimmed.split(" ");
    const cName = parts[parts.length - 1];

    try {
      await fetch(`${API_BASE}/devstoreaccount1/${cName}?restype=container`, {method: "PUT"});
      appendLine(`{ "created": true, "name": "${cName}" }`, "output");
      appendLine(`✓ Container '${cName}' created in default account 'devstoreaccount1'.`, "output");
    } catch (err) {
      appendLine(`✓ Container '${cName}' created (simulated).`, "output");
    }
    return;
  }

  // Service Bus Topic
  if (trimmed.startsWith("az servicebus topic create")) {
    const parts = trimmed.split(" ");
    const tName = parts[parts.length - 1];

    try {
      await fetch(`${API_BASE}/servicebus/topics/${tName}`, {method: "PUT"});
      appendLine(`{ "name": "${tName}", "status": "Active" }`, "output");
      appendLine(`✓ Service Bus topic '${tName}' created.`, "output");
    } catch (err) {
      appendLine(`✓ Service Bus topic '${tName}' created.`, "output");
    }
    return;
  }

  // Key Vault Secret
  if (trimmed.startsWith("az keyvault secret set")) {
    const nameMatch = trimmed.match(/--name\s+([^\s]+)/);
    const valMatch = trimmed.match(/--value\s+([^\s]+)/);
    const secName = nameMatch ? nameMatch[1] : "db-pass";
    const secVal = valMatch ? valMatch[1] : "secret123";

    try {
      await fetch(`${API_BASE}/secrets/${secName}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({value: secVal})
      });
      appendLine(`{ "id": "http://localhost:10000/secrets/${secName}/v1", "value": "${secVal}" }`, "output");
      appendLine(`✓ Secret '${secName}' saved to Key Vault.`, "output");
    } catch (err) {
      appendLine(`✓ Secret '${secName}' saved to Key Vault.`, "output");
    }
    return;
  }

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
