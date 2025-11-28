// ============ Configuration ============
const OWNER_MOBILE = "+917000000000"; // <-- change to real owner mobile
document.getElementById('ownerMobileDisplay').innerText = OWNER_MOBILE;

// Local storage key
const STORAGE_KEY = "babi_bahi_bills_v1";
let bills = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

// Utility: format date/time nicely
function formatLocal(dt){
  const d = new Date(dt);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

// Create bill ID
function uid(){ return Date.now() + Math.floor(Math.random()*999); }

// ======= DOM refs =======
const billForm = document.getElementById('billForm');
const tbody = document.querySelector("#billTable tbody");
const smsPopup = document.getElementById('smsPopup');
const smsPreview = document.getElementById('smsPreview');
const openSmsComposer = document.getElementById('openSmsComposer');
const closeSmsBtn = document.getElementById('closeSmsBtn');
const saveCloudBtn = document.getElementById('saveCloudBtn');
const resetBtn = document.getElementById('resetBtn');

// ======= Load UI =======
function renderBills(){
  tbody.innerHTML = "";
  if(!bills.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#6b7280;padding:20px">No unpaid bills — add one above</td></tr>`;
    return;
  }
  bills.forEach(b => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(b.name)}<div class="meta" style="font-size:12px;color:#6b7280">${escapeHtml(b.mobile)} • ${escapeHtml(b.location)}</div></td>
      <td>${escapeHtml(b.product)}</td>
      <td>₹${Number(b.amount).toFixed(2)} <div style="font-size:12px;color:#6b7280">GST:${b.gst}%</div></td>
      <td>${formatLocal(b.datetime)}</td>
      <td><button class="btn" onclick="onSms(${b.id})">SMS</button></td>
      <td><button class="btn" onclick="onPdf(${b.id})">PDF</button></td>
      <td><button class="btn" onclick="onEdit(${b.id})">Edit</button></td>
      <td><button class="btn" onclick="onDelete(${b.id})">Delete</button></td>
    `;
    tbody.appendChild(tr);
  });
}

// Escape HTML
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// ======= Form submit (Add Bill) =======
billForm.addEventListener('submit', e => {
  e.preventDefault();
  const b = {
    id: uid(),
    name: document.getElementById('customerName').value.trim(),
    location: document.getElementById('customerLocation').value.trim(),
    mobile: document.getElementById('customerMobile').value.trim(),
    product: document.getElementById('product').value.trim(),
    amount: parseFloat(document.getElementById('amount').value || 0),
    gst: parseFloat(document.getElementById('gst').value || 0),
    datetime: document.getElementById('dateTime').value ? new Date(document.getElementById('dateTime').value).toISOString() : new Date().toISOString()
  };
  bills.push(b);
  saveLocal();
  billForm.reset();
  renderBills();
});

// Reset button
resetBtn.addEventListener('click', ()=> billForm.reset());

// Save to cloud (optional - placeholder)
saveCloudBtn.addEventListener('click', ()=> {
  alert("Cloud save optional — see Firebase snippet in code comments to enable cloud storage.");
});

// Save to localStorage
function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

// Delete
function onDelete(id){
  if(!confirm("Delete this bill?")) return;
  bills = bills.filter(b => b.id !== id);
  saveLocal();
  renderBills();
}

// Edit
function onEdit(id){
  const b = bills.find(x => x.id===id);
  if(!b) return alert("Bill not found");
  document.getElementById('customerName').value = b.name;
  document.getElementById('customerLocation').value = b.location;
  document.getElementById('customerMobile').value = b.mobile;
  document.getElementById('product').value = b.product;
  document.getElementById('amount').value = b.amount;
  document.getElementById('gst').value = b.gst;
  document.getElementById('dateTime').value = new Date(b.datetime).toISOString().slice(0,16);
  // remove old (will be re-saved on submit)
  bills = bills.filter(x => x.id !== id);
  saveLocal();
  renderBills();
}

// =========== SMS behavior ===========
// 1) In-browser preview popup (smsPreview) and 2) open native SMS composer on mobile devices
let lastSmsMessage = "", lastSmsRecipient = "";

function buildSmsMessage(b){
  const lines = [
    `BABI BAHI CYCLE STORE`,
    `Customer: ${b.name}`,
    `Item: ${b.product}`,
    `Amount Due: ₹${Number(b.amount).toFixed(2)}`,
    `GST: ${b.gst}%`,
    `Date: ${formatLocal(b.datetime)}`,
    `Please pay at earliest. Owner: ${OWNER_MOBILE}`
  ];
  return lines.join("\n");
}

// Called when user clicks SMS button in table
window.onSms = function(id){
  const b = bills.find(x => x.id===id);
  if(!b) return alert("Bill not found");
  const message = buildSmsMessage(b);
  lastSmsMessage = message;
  lastSmsRecipient = b.mobile || "";
  smsPreview.innerText = `To: ${lastSmsRecipient}\n\n${message}`;
  smsPopup.style.display = 'flex';

  // set action for opening SMS composer
  openSmsComposer.onclick = () => openNativeSmsComposer(lastSmsRecipient, message);
  closeSmsBtn.onclick = () => { smsPopup.style.display = 'none'; };
};

// Open native SMS composer (works on mobile browsers)
function openNativeSmsComposer(recipient, message){
  // detect iOS vs android param for body
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.MSStream;
  const bodyParam = isIOS ? '&body=' : '?body=';
  // Use owner receiving? We open composer to send from the user's phone to owner or whichever recipient:
  // We'll open the SMS composer with recipient prefilled as OWNER_MOBILE, but you can change to recipient variable.
  // If you actually want the user to send to owner mobile, set to OWNER_MOBILE
  const to = encodeURIComponent(OWNER_MOBILE); // send to owner
  const encodedBody = encodeURIComponent(message);
  const smsUrl = `sms:${to}${bodyParam}${encodedBody}`;

  // For desktop browsers fallback: show alert / copy to clipboard
  try {
    window.location.href = smsUrl;
  } catch (err) {
    // fallback
    navigator.clipboard?.writeText(message);
    alert("SMS composer could not be opened. Message copied to clipboard.");
  }
  // Close popup
  smsPopup.style.display = 'none';
}

// =========== PDF placeholder (you can add jsPDF code from previous step) ===========
window.onPdf = function(id){
  const b = bills.find(x => x.id===id);
  if(!b) return alert("Bill not found");
  // You can generate PDF using jspdf (include library) — placeholder:
  const msg = `Generate PDF for ${b.name} — implement jsPDF or server-side PDF as needed.`;
  alert(msg);
};

// =========== Init render ===========
renderBills();

/* ================= Optional: Firebase Realtime DB (Cloud) Example =================
  To enable, add Firebase SDK script in index.html and initialize with your config.
  Then replace saveLocal() or create saveToCloud(bill) to push to DB.

  // Example firebase push (Realtime DB)
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
  import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

  const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
  };
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  function saveToCloud(bill){
    push(ref(db, 'bills'), bill)
      .then(()=> alert('Saved to cloud'))
      .catch(e => alert('Cloud save error: '+e));
  }

  // call saveToCloud(b) where appropriate
*/

/* ================= Optional: Twilio (server-side) example =================
  To have the server send SMS to owner automatically when a bill is created,
  make a server endpoint (Node.js example). IMPORTANT: Keep Twilio creds on server only.

  // server.js (Node/Express)
  const express = require('express');
  const bodyParser = require('body-parser');
  const twilio = require('twilio');
  const app = express();
  app.use(bodyParser.json());
  const accountSid = 'TWILIO_ACCOUNT_SID';
  const authToken = 'TWILIO_AUTH_TOKEN';
  const client = twilio(accountSid, authToken);

  app.post('/send-sms', async (req, res) => {
    const { to, message } = req.body; // to = owner mobile
    try {
      const resp = await client.messages.create({
        body: message,
        from: 'TWILIO_PHONE_NUMBER', // your twilio number
        to
      });
      res.json({ ok: true, sid: resp.sid });
    } catch (err) {
      res.status(500).json({ ok:false, error: err.message});
    }
  });

  // Call this endpoint from the web app (fetch) when a new bill is created.
*/

/* ================= Optional: Native mobile wrapper (Cordova / Capacitor) =================
  If you want a real Android/iOS app that can send SMS without opening composer:
  - Use Cordova / Capacitor and the SMS plugin (cordova-sms-plugin or @capacitor-community/sms)
  Example (Capacitor community sms):
    import { SMS } from '@capacitor-community/sms';
    await SMS.send({
      phoneNumber: OWNER_MOBILE,
      message: 'Your message',
      // iOS will open composer, Android can send directly with proper permission
    });
  Note: Android direct send requires SEND_SMS permission and user's consent.
*/
