import { db } from "./firebase.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const arr = v => Array.isArray(v) ? v : [];
const has = v => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
const KEYS = ["mode", "location", "english", "company", "position", "transport", "education", "salary", "age"];
let offers = [], q = "", loaded = false, failed = false;

const locs = o => arr(o.locations).length ? o.locations : o.location ? [o.location] : [];
const money = o => o.salaryText || (has(o.salary) ? `${Number(o.salary).toLocaleString()} EGP${o.salaryType ? " / " + o.salaryType : ""}` : "");
const trans = o => o.transportation === true ? "Available" : o.transportation === false ? "Not available" : "";
const edu = o => o.graduationRequired ? "Graduates required" : arr(o.education).join(", ");
const age = o => has(o.minAge) && has(o.maxAge) ? `${o.minAge}–${o.maxAge}` : has(o.minAge) ? `${o.minAge}+` : has(o.maxAge) ? `Up to ${o.maxAge}` : "";
const ms = o => o.updatedAt?.toMillis?.() || 0;

// Realtime listener: only offers the public is allowed to see (matches the security rules)
onSnapshot(query(collection(db, "offers"), where("status", "==", "ACTIVE"), where("published", "==", true)),
  snap => { offers = snap.docs.map(d => ({ id: d.id, ...d.data() })); loaded = true; failed = false; render(); },
  err => { console.error(err); failed = true; loaded = true; render(); });

function fill(key, vals, label) {
  const s = $("#f-" + key), cur = s.value, u = [...new Set(vals.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  s.innerHTML = `<option value="">${label}</option>` + u.map(v => `<option>${esc(v)}</option>`).join("");
  s.value = u.includes(cur) ? cur : "";
}
function match(o, F) {
  const hay = [o.company, o.position, o.category, locs(o).join(" "), o.workMode, arr(o.englishLevel).join(" "), money(o), arr(o.requirements).join(" "), arr(o.benefits).join(" "), arr(o.education).join(" "), o.shiftType, o.experience].join(" ").toLowerCase();
  if (q && !q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
  if (F.location && !locs(o).includes(F.location)) return false;
  if (F.mode && o.workMode !== F.mode) return false;
  if (F.english && !arr(o.englishLevel).includes(F.english)) return false;
  if (F.company && o.company !== F.company) return false;
  if (F.position && o.position !== F.position) return false;
  if (F.education && !arr(o.education).includes(F.education)) return false;
  if (F.transport === "yes" && o.transportation !== true) return false;
  if (F.transport === "no" && o.transportation !== false) return false;
  if (F.transport === "unknown" && has(o.transportation)) return false;
  if (F.salary && !(Number(o.salary) >= Number(F.salary))) return false;
  if (F.age) { const a = Number(F.age); if ((has(o.minAge) && a < o.minAge) || (has(o.maxAge) && a > o.maxAge)) return false; }
  return true;
}
const li = (k, v) => has(v) ? `<li><span>${k}</span><b style="font-weight:500">${esc(v)}</b></li>` : "";

function render() {
  const grid = $("#grid");
  if (!loaded) { grid.innerHTML = '<div class="sk"></div>'.repeat(3); $("#count").textContent = "Loading offers…"; return; }
  if (failed) { grid.innerHTML = '<div class="empty"><h3>We couldn’t load the offers</h3><p>Check your internet connection and reload the page.</p></div>'; $("#count").textContent = ""; return; }
  fill("mode", offers.map(o => o.workMode), "Any");
  fill("location", offers.flatMap(locs), "All locations");
  fill("english", offers.flatMap(o => arr(o.englishLevel)), "Any language");
  fill("company", offers.map(o => o.company), "All companies");
  fill("position", offers.map(o => o.position), "All positions");
  fill("education", offers.flatMap(o => arr(o.education)), "Any");
  const F = Object.fromEntries(KEYS.map(k => [k, $("#f-" + k).value]));
  const nf = Object.values(F).filter(Boolean).length; $("#mF").textContent = "Filters" + (nf ? ` (${nf})` : "");
  const list = offers.filter(o => match(o, F)).sort((a, b) => (b.featured === true) - (a.featured === true) || ms(b) - ms(a));
  $("#count").textContent = `${list.length} offer${list.length === 1 ? "" : "s"}`;
  if (!list.length) {
    grid.innerHTML = offers.length ? '<div class="empty"><h3>No offers match your search</h3><p>Try changing your filters.</p></div>' : '<div class="empty"><h3>No active offers right now</h3><p>New offers appear here as soon as they are published. Check back soon.</p></div>';
    return;
  }
  grid.innerHTML = list.map(o => `<article class="card${o.featured ? " feat" : ""}"><div class="co"><span>${esc(o.company)}</span>${o.featured ? '<span class="badge">Featured</span>' : ""}</div><h3>${esc(o.position)}</h3><ul class="facts">${li("Salary", money(o))}${li("Language", arr(o.englishLevel).join(" / "))}${li("Work type", o.workMode)}${li("Location", locs(o).join(" · "))}${li("Transportation", trans(o))}${li("Education", edu(o))}${li("Shift", o.shiftType)}</ul><button class="btn" data-id="${esc(o.id)}">View offer</button></article>`).join("");
}

const row = (k, v) => has(v) ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : "";
const sec = (t, rows) => rows.trim() ? `<h4>${t}</h4><dl class="kv">${rows}</dl>` : "";
const list = (t, a) => arr(a).length ? `<h4>${t}</h4><ul class="l">${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : "";

function openOffer(o) {
  $("#dc").textContent = o.company || ""; $("#dt").textContent = o.position || "";
  const num = String(o.hrWhatsapp || "").replace(/\D/g, "");
  const tpl = o.whatsappMessage || "Hello, I'm interested in the [position] offer at [company] in [location].\n\nI'd like to apply for this offer.\nPlease let me know the next steps.";
  const msg = tpl.replaceAll("[position]", o.position || "").replaceAll("[company]", o.company || "").replaceAll("[location]", locs(o).join(", ") || "Online");
  const days = has(o.workingDays) ? `${o.workingDays} days / week` : "";
  $("#dbody").innerHTML =
    sec("Job information", row("Company", o.company) + row("Position", o.position) + row("Category", o.category) + row("Work type", o.workMode) + row(locs(o).length > 1 ? "Locations" : "Location", locs(o).join(" · ")) + row("Salary", money(o))) +
    sec("Requirements", row("Language", arr(o.englishLevel).join(" / ")) + row("Age", age(o)) + row("Education", edu(o)) + row("Experience", o.experience) + row("Gender", o.gender && o.gender !== "Any" ? o.gender : "")) +
    list("Other requirements", o.requirements) +
    sec("Working conditions", row("Working days", days) + row("Days off", o.daysOff) + row("Shift", o.shiftType) + row("Shift details", o.shiftDetails) + row("Transportation", [trans(o), o.transportationDetails].filter(Boolean).join(" – "))) +
    list("Benefits", o.benefits) +
    `<h4>How to apply</h4>` + (num ? `<p>Contact HR on WhatsApp. A message is prepared for you.</p><div class="apply"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${num}?text=${encodeURIComponent(msg)}">Apply / Contact HR</a></div>` : "<p>Application details are not available for this offer yet.</p>");
  $("#dlg").showModal();
}

// events
$("#grid").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b) { const o = offers.find(x => x.id === b.dataset.id); if (o) openOffer(o); } });
$("#dx").onclick = () => $("#dlg").close();
$("#dlg").addEventListener("click", e => { if (e.target === e.currentTarget) e.currentTarget.close(); });
let t; $("#q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim(); render(); }, 150); });
KEYS.forEach(k => $("#f-" + k).addEventListener("input", render));
$("#clear").onclick = () => { KEYS.forEach(k => $("#f-" + k).value = ""); $("#q").value = ""; q = ""; render(); };
const sheet = on => { $("#filters").classList.toggle("open", on); $("#bd").classList.toggle("open", on); };
$("#openF").onclick = () => { $("#nav").classList.remove("open"); matchMedia("(min-width:860px)").matches ? $("#f-location").focus() : sheet(true); };
$("#closeF").onclick = $("#bd").onclick = () => sheet(false);
$("#goSearch").onclick = () => { $("#nav").classList.remove("open"); scrollTo({ top: 0, behavior: "smooth" }); $("#q").focus(); };
$("#menu").onclick = e => { const o = $("#nav").classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); };
$("#mF").onclick = () => sheet(true);
render();
