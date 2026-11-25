import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const $ = (id) => document.getElementById(id);
const configured = SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const DB_NAME = "my-expense-manager";
const STORE = "transactions";
let currentUser = null;
let records = [];

function money(value) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT" }).format(Number(value || 0));
}
function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).className = "message" + (error ? " error" : "");
}
function setOnlineStatus() {
  $("connection").textContent = navigator.onLine ? "Online" : "Offline";
  $("connection").classList.toggle("offline", !navigator.onLine);
}
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("user_id", "user_id");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function localAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function localPut(item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(item);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}
async function localDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readwrite").objectStore(STORE).delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}
function showSignedIn(signedIn) {
  $("authPanel").classList.toggle("hidden", signedIn);
  $("appPanel").classList.toggle("hidden", !signedIn);
  $("logoutBtn").classList.toggle("hidden", !signedIn);
}
function render() {
  const visible = records.filter(r => {
    const typeOK = $("filterType").value === "all" || r.type === $("filterType").value;
    const term = $("searchInput").value.toLowerCase();
    const textOK = `${r.category} ${r.note || ""}`.toLowerCase().includes(term);
    return typeOK && textOK;
  }).sort((a,b) => b.transaction_date.localeCompare(a.transaction_date));
  const income = records.filter(r => r.type === "income").reduce((s,r) => s + Number(r.amount), 0);
  const expense = records.filter(r => r.type === "expense").reduce((s,r) => s + Number(r.amount), 0);
  $("incomeTotal").textContent = money(income);
  $("expenseTotal").textContent = money(expense);
  $("balanceTotal").textContent = money(income - expense);
  $("transactionRows").replaceChildren();
  if (!visible.length) {
    const tr = document.createElement("tr"), td = document.createElement("td");
    td.colSpan = 4; td.className = "muted"; td.textContent = "No matching transactions.";
    tr.append(td); $("transactionRows").append(tr); return;
  }
  for (const r of visible) {
    const tr = document.createElement("tr");
    const date = document.createElement("td"); date.textContent = r.transaction_date;
    const detail = document.createElement("td");
    const strong = document.createElement("strong"); strong.textContent = r.category;
    const note = document.createElement("small"); note.textContent = r.note || r.type;
    detail.append(strong, document.createElement("br"), note);
    const amount = document.createElement("td"); amount.className = r.type;
    amount.textContent = (r.type === "income" ? "+" : "−") + money(r.amount);
    const actions = document.createElement("td");
    const edit = document.createElement("button"); edit.className = "tiny secondary"; edit.textContent = "Edit";
    edit.addEventListener("click", () => beginEdit(r));
    const del = document.createElement("button"); del.className = "tiny danger-button"; del.textContent = "Delete";
    del.addEventListener("click", () => removeRecord(r));
    actions.append(edit, del); tr.append(date, detail, amount, actions);
    $("transactionRows").append(tr);
  }
}
function beginEdit(r) {
  $("transactionId").value = r.id; $("type").value = r.type;
  $("amount").value = r.amount; $("category").value = r.category;
  $("transactionDate").value = r.transaction_date; $("note").value = r.note || "";
  $("formHeading").textContent = "Edit transaction";
  $("saveBtn").textContent = "Update transaction";
  $("cancelEditBtn").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  $("transactionForm").reset(); $("transactionId").value = "";
  $("transactionDate").value = new Date().toISOString().slice(0,10);
  $("formHeading").textContent = "Add transaction"; $("saveBtn").textContent = "Save transaction";
  $("cancelEditBtn").classList.add("hidden");
}
async function loadRecords() {
  if (!currentUser) return;
  const local = (await localAll()).filter(r => r.user_id === currentUser.id);
  records = local;
  if (navigator.onLine && supabase) {
    const { data, error } = await supabase.from("transactions").select("*").order("transaction_date", { ascending: false });
    if (!error && data) {
      const pending = local.filter(r => r.sync_status === "pending");
      records = [...data, ...pending.filter(p => !data.some(d => d.id === p.id))];
      for (const r of data) await localPut({ ...r, sync_status: "synced" });
    }
  }
  render();
}
async function syncPending() {
  if (!currentUser || !supabase || !navigator.onLine) {
    $("syncStatus").textContent = "Offline — waiting to sync"; return;
  }
  $("syncStatus").textContent = "Syncing…";
  const pending = (await localAll()).filter(r => r.user_id === currentUser.id && r.sync_status === "pending");
  for (const r of pending) {
    const payload = {
      id: r.id, user_id: currentUser.id, type: r.type, amount: r.amount,
      category: r.category, transaction_date: r.transaction_date, note: r.note || ""
    };
    const { error } = await supabase.from("transactions").upsert(payload);
    if (error) {
      $("syncStatus").textContent = "Sync issue — " + error.message;
      return;
    }
    await localPut({ ...r, sync_status: "synced" });
  }
  $("syncStatus").textContent = pending.length ? `Synced ${pending.length} record(s)` : "All changes synced";
  await loadRecords();
}
async function removeRecord(r) {
  if (!confirm("Delete this transaction?")) return;
  if (r.sync_status === "synced" && navigator.onLine) {
    const { error } = await supabase.from("transactions").delete().eq("id", r.id);
    if (error) { alert(error.message); return; }
  } else if (r.sync_status === "synced") {
    alert("This transaction is already in the cloud. Connect to the internet to delete it safely."); return;
  }
  await localDelete(r.id);
  records = records.filter(x => x.id !== r.id); render();
}
$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!supabase) return message("authMessage", "Configure config.js first.", true);
  const { data, error } = await supabase.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) return message("authMessage", error.message, true);
  currentUser = data.user; $("userEmail").textContent = currentUser.email;
  showSignedIn(true); await loadRecords(); await syncPending();
});
$("signupBtn").addEventListener("click", async () => {
  if (!supabase) return message("authMessage", "Configure config.js first.", true);
  const { error } = await supabase.auth.signUp({ email: $("email").value.trim(), password: $("password").value });
  message("authMessage", error ? error.message : "Account created. If email confirmation is enabled, confirm your email before logging in.", !!error);
});
$("logoutBtn").addEventListener("click", async () => {
  if (supabase) await supabase.auth.signOut();
  currentUser = null; records = []; showSignedIn(false);
});
$("transactionForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const id = $("transactionId").value || crypto.randomUUID();
  const old = records.find(r => r.id === id);
  const item = {
    id, user_id: currentUser.id, type: $("type").value,
    amount: Number($("amount").value), category: $("category").value,
    transaction_date: $("transactionDate").value, note: $("note").value.trim(),
    sync_status: "pending", created_at: old?.created_at || new Date().toISOString()
  };
  if (!(item.amount > 0)) return message("formMessage", "Enter an amount greater than zero.", true);
  await localPut(item);
  records = [item, ...records.filter(r => r.id !== id)];
  render(); resetForm();
  message("formMessage", navigator.onLine ? "Saved on this device. Syncing…" : "Saved offline. It will sync when you're online.");
  await syncPending();
});
$("cancelEditBtn").addEventListener("click", resetForm);
$("syncBtn").addEventListener("click", syncPending);
$("searchInput").addEventListener("input", render);
$("filterType").addEventListener("change", render);
window.addEventListener("online", () => { setOnlineStatus(); syncPending(); });
window.addEventListener("offline", setOnlineStatus);

$("transactionDate").value = new Date().toISOString().slice(0,10);
setOnlineStatus();
if (!configured) $("setupNotice").classList.remove("hidden");
if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
if (supabase) {
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      currentUser = session.user; $("userEmail").textContent = currentUser.email;
      showSignedIn(true); await loadRecords(); await syncPending();
    }
  });
}
