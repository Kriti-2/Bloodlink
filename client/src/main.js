import "./style.css";
import axios from "axios";
// At the top of src/main.js (after importing axios)
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token stored in localStorage (admin token)
      localStorage.removeItem("bloodlink_admin_token");
      // Optional: show admin login UI or redirect
      // window.location.href = "/admin.html"; // if you want to force redirect
    }
    return Promise.reject(error);
  }
);

const API_BASE = "http://localhost:5000";
const ADMIN_TOKEN_KEY = "bloodlink_admin_token";

/* ---------- HELPER: ADMIN TOKEN HANDLING ---------- */

function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/* ---------- ADMIN LOGIN / LOGOUT UI HANDLING ---------- */

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLoginCard = document.getElementById("adminLoginCard");
const adminPanelCard = document.getElementById("adminPanelCard");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

function showAdminPanel() {
  if (adminLoginCard) adminLoginCard.style.display = "none";
  if (adminPanelCard) adminPanelCard.style.display = "block";
}

function showAdminLogin() {
  if (adminPanelCard) adminPanelCard.style.display = "none";
  if (adminLoginCard) adminLoginCard.style.display = "block";
}


if (adminLoginForm) {
  // If token already exists (page refresh), show admin panel
  if (getAdminToken()) {
    showAdminPanel();
  }

  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (adminLoginMessage) adminLoginMessage.textContent = "Logging in...";

    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;

    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, {
        email,
        password,
      });

      const { token, user } = res.data;

      if (!token) {
        throw new Error("No token returned from server");
      }

      setAdminToken(token);
      showAdminPanel();

      if (adminLoginMessage) {
        adminLoginMessage.textContent = `✅ Logged in as ${user?.name || "Admin"}`;
      }
      adminLoginForm.reset();
    } catch (err) {
      console.error(err);
      if (adminLoginMessage) {
        adminLoginMessage.textContent =
          "❌ Login failed. Check your email/password.";
      }
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", () => {
    clearAdminToken();
    showAdminLogin();
  });
}

/* ---------- DONOR REGISTRATION (donor.html) ---------- */

const donorForm = document.getElementById("donorForm");
if (donorForm) {
  const donorMessage = document.getElementById("message");

  donorForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const donor = {
      name: document.getElementById("name").value,
      phone: document.getElementById("phone").value,
      city: document.getElementById("city").value,
      area: document.getElementById("area").value,
      bloodGroup: document.getElementById("bloodGroup").value,
    };

    try {
      await axios.post(`${API_BASE}/api/donors`, donor);
      donorMessage.innerText = "✅ Donor Registered Successfully";
      donorForm.reset();
    } catch (err) {
      console.error(err);
      donorMessage.innerText = "❌ Error Registering Donor";
    }
  });
}

/* ---------- EMERGENCY BLOOD REQUEST (need-blood.html) ---------- */

const requestForm = document.getElementById("requestForm");
const requestMessage = document.getElementById("requestMessage");
const matchedDonorsBox = document.getElementById("matchedDonorsBox");

if (requestForm) {
  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    requestMessage.textContent = "Submitting request...";
    if (matchedDonorsBox) matchedDonorsBox.innerHTML = "";

    const requestBody = {
      requiredBloodGroup: document.getElementById("reqBloodGroup").value,
      hospitalName: document.getElementById("hospitalName").value,
      city: document.getElementById("reqCity").value,
      contactNumber: document.getElementById("contactNumber").value,
      urgency: document.getElementById("urgency").value,
    };

    try {
      const res = await axios.post(`${API_BASE}/api/requests`, requestBody);

      const { message, matches } = res.data || {};

      requestMessage.textContent =
        message || "🚨 Blood request created successfully.";

      if (matchedDonorsBox) {
        if (matches && matches.length) {
          const items = matches
            .map(
              (d) => `
              <li>
                <strong>${d.name}</strong> (${d.bloodGroup}) – ${d.city}${
                d.area ? ", " + d.area : ""
              }<br/>
                📞 ${d.phone}
              </li>`
            )
            .join("");

          matchedDonorsBox.innerHTML = `
            <h4>We’ve notified ${matches.length} nearby donor${
              matches.length > 1 ? "s" : ""
            }:</h4>
            <ul class="mini-list">
              ${items}
            </ul>
          `;
        } else {
          matchedDonorsBox.innerHTML = `
            <p>No matching donors right now. Your request is still saved and visible to the network.</p>
          `;
        }
      }

      requestForm.reset();
      const urgencySelect = document.getElementById("urgency");
      if (urgencySelect) urgencySelect.value = "normal";
    } catch (err) {
      console.error(err);
      requestMessage.textContent =
        "❌ Error creating blood request. Please try again.";
    }
  });
}

/* ---------- FIND DONORS (find-donor.html) ---------- */

const searchForm = document.getElementById("searchForm");
if (searchForm) {
  const searchResultsDiv = document.getElementById("searchResults");

  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    searchResultsDiv.innerHTML = "Searching...";

    const bloodGroup = document.getElementById("searchBloodGroup").value;
    const city = document.getElementById("searchCity").value;

    const params = {};
    if (bloodGroup) params.bloodGroup = bloodGroup;
    if (city) params.city = city;

    try {
      const res = await axios.get(`${API_BASE}/api/donors`, { params });
      const donors = res.data;

      if (!donors.length) {
        searchResultsDiv.innerHTML = "<p>No donors found.</p>";
        return;
      }

      const listItems = donors
        .map(
          (d) => `
          <li>
            <strong>${d.name}</strong> (${d.bloodGroup}) - ${d.city}, ${
            d.area || ""
          }<br/>
            Phone: ${d.phone}
          </li>`
        )
        .join("");

      searchResultsDiv.innerHTML = `<ul>${listItems}</ul>`;
    } catch (err) {
      console.error(err);
      searchResultsDiv.innerHTML = "<p>❌ Error fetching donors</p>";
    }
  });
}

/* ---------- ADMIN: MANAGE DONORS (admin.html) ---------- */

const loadDonorsBtn = document.getElementById("loadDonorsBtn");
if (loadDonorsBtn) {
  const adminDonorList = document.getElementById("adminDonorList");

  async function loadDonorsForAdmin() {
    adminDonorList.innerHTML = "Loading donors...";

    const token = getAdminToken();
    if (!token) {
      adminDonorList.innerHTML = "<p>❌ Please login as admin first.</p>";
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/donors`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const donors = res.data;

      if (!donors.length) {
        adminDonorList.innerHTML = "<p>No donors yet.</p>";
        return;
      }

      const rows = donors
        .map(
          (d) => `
          <tr>
            <td>${d.name}</td>
            <td>${d.bloodGroup}</td>
            <td>${d.city}</td>
            <td>${d.phone}</td>
            <td>${d.verificationStatus}</td>
            <td>${d.availability ? "Available" : "Unavailable"}</td>
            <td>
              ${
                d.verificationStatus !== "verified"
                  ? `<button data-id="${d._id}" class="verifyBtn">Verify</button>`
                  : ""
              }
              <button data-id="${d._id}" data-available="${
            d.availability ? "true" : "false"
          }" class="toggleAvailBtn">
                ${d.availability ? "Mark Unavailable" : "Mark Available"}
              </button>
            </td>
          </tr>`
        )
        .join("");

      adminDonorList.innerHTML = `
        <table border="1" cellpadding="6">
          <thead>
            <tr>
              <th>Name</th>
              <th>Blood Group</th>
              <th>City</th>
              <th>Phone</th>
              <th>Verification</th>
              <th>Availability</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      // verify buttons
      document.querySelectorAll(".verifyBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          try {
            await axios.patch(
              `${API_BASE}/api/donors/${id}/verify`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            loadDonorsForAdmin();
          } catch (err) {
            console.error(err);
            alert("❌ Error verifying donor. Are you logged in as admin?");
          }
        });
      });

      // availability toggle
      document.querySelectorAll(".toggleAvailBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const current = btn.getAttribute("data-available") === "true";
          try {
            await axios.patch(
              `${API_BASE}/api/donors/${id}/availability`,
              { availability: !current },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            loadDonorsForAdmin();
          } catch (err) {
            console.error(err);
            alert("❌ Error updating availability. Are you logged in as admin?");
          }
        });
      });
    } catch (err) {
      console.error(err);
      adminDonorList.innerHTML = "<p>❌ Error loading donors</p>";
    }
  }

  loadDonorsBtn.addEventListener("click", loadDonorsForAdmin);
}

/* ---------- ADMIN: MANAGE REQUESTS (admin.html) ---------- */

const loadRequestsBtn = document.getElementById("loadRequestsBtn");
if (loadRequestsBtn) {
  const adminRequestList = document.getElementById("adminRequestList");

  async function loadRequestsForAdmin() {
    adminRequestList.innerHTML = "Loading requests...";

    const token = getAdminToken();
    if (!token) {
      adminRequestList.innerHTML = "<p>❌ Please login as admin first.</p>";
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/api/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const requests = res.data;

      if (!requests.length) {
        adminRequestList.innerHTML = "<p>No open requests.</p>";
        return;
      }

      const rows = requests
        .map(
          (r) => `
          <tr>
            <td>${r.requiredBloodGroup}</td>
            <td>${r.hospitalName}</td>
            <td>${r.city}</td>
            <td>${r.contactNumber}</td>
            <td>${r.urgency}</td>
            <td><button data-id="${r._id}" class="closeReqBtn">Mark Closed</button></td>
          </tr>`
        )
        .join("");

      adminRequestList.innerHTML = `
        <table border="1" cellpadding="6">
          <thead>
            <tr>
              <th>Blood Group</th>
              <th>Hospital</th>
              <th>City</th>
              <th>Contact</th>
              <th>Urgency</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;

      document.querySelectorAll(".closeReqBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          try {
            await axios.patch(
              `${API_BASE}/api/requests/${id}/close`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            loadRequestsForAdmin();
          } catch (err) {
            console.error(err);
            alert("❌ Error closing request. Are you logged in as admin?");
          }
        });
      });
    } catch (err) {
      console.error(err);
      adminRequestList.innerHTML = "<p>❌ Error loading requests</p>";
    }
  }

  loadRequestsBtn.addEventListener("click", loadRequestsForAdmin);
}

/* ---------- HERO QUOTE / IMAGE SLIDER (index.html) ---------- */

const heroSlide = document.getElementById("heroSlide");
if (heroSlide) {
  const heroQuoteEl = document.getElementById("heroQuote");
  const heroMetaEl = document.getElementById("heroMeta");
  const heroDots = document.querySelectorAll(".hero-dot");

  const slides = [
    {
      text: "One donation can save up to three lives. Your blood could be someone's second chance.",
      meta: "Fact • WHO estimates millions of lives saved every year through blood donations.",
      image:
        "https://images.pexels.com/photos/4226215/pexels-photo-4226215.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      text: "Some heroes don't wear capes. They simply roll up their sleeves and donate.",
      meta: "Quote • Anonymous donor after helping a stranger in an emergency.",
      image:
        "https://images.pexels.com/photos/3786125/pexels-photo-3786125.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
    {
      text: "In the time you spend scrolling, you could register as a donor and change a family's story.",
      meta: "Reminder • It takes less than 2 minutes to register on BloodLink.",
      image:
        "https://images.pexels.com/photos/8376235/pexels-photo-8376235.jpeg?auto=compress&cs=tinysrgb&w=1200",
    },
  ];

  let currentSlide = 0;

  function renderSlide(index) {
    const slide = slides[index];
    if (!slide) return;

    heroQuoteEl.textContent = slide.text;
    heroMetaEl.textContent = slide.meta;
    heroSlide.style.backgroundImage = `url("${slide.image}")`;

    heroDots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
  }

  renderSlide(currentSlide);

  setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    renderSlide(currentSlide);
  }, 6000);

  heroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const idx = Number(dot.getAttribute("data-index"));
      currentSlide = idx;
      renderSlide(currentSlide);
    });
  });
}
/* ---------- Small rule-based chatbot (vanilla JS) ---------- */
/* Requires: axios, API_BASE (already set in main.js) */

(function createChatbot() {
  // Avoid duplicate if injected twice
  if (document.getElementById("bchat-root")) return;

  // Root button
  const btn = document.createElement("button");
  btn.className = "bchat-btn";
  btn.id = "bchat-toggle";
  btn.title = "Open BloodLink Assistant";
  btn.textContent = "💬";
  document.body.appendChild(btn);

  // Chat window
  const win = document.createElement("div");
  win.className = "bchat-window";
  win.id = "bchat-root";
  win.style.display = "none"; // hidden initially
  win.innerHTML = `
    <div class="bchat-header">
      <div>BloodLink Assistant</div>
      <button id="bchat-close" style="background:transparent;border:none;color:rgba(255,255,255,0.9);font-size:18px;cursor:pointer">✖</button>
    </div>
    <div class="bchat-messages" id="bchat-messages"></div>
    <div class="bchat-suggest" id="bchat-suggest"></div>
    <div class="bchat-input-row">
      <input class="bchat-input" id="bchat-input" placeholder="Type 'need blood', 'donate' or 'track [id]'">
      <button class="bchat-send" id="bchat-send">Send</button>
    </div>
  `;
  document.body.appendChild(win);

  const messagesEl = document.getElementById("bchat-messages");
  const suggestEl = document.getElementById("bchat-suggest");
  const inputEl = document.getElementById("bchat-input");
  const sendEl = document.getElementById("bchat-send");

  function pushMessage(from, text) {
    const el = document.createElement("div");
    el.className = "bchat-msg " + (from === "bot" ? "bot" : "user");
    el.textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // initial welcome + quick buttons
  function showWelcome() {
    pushMessage("bot", "Hi — I can help: 'need blood', 'donate', or 'track request'.");
    renderQuick(["need blood", "donate", "track request"]);
  }

  function clearSuggest() { suggestEl.innerHTML = ""; }
  function renderQuick(items) {
    clearSuggest();
    items.forEach((t) => {
      const b = document.createElement("button");
      b.textContent = t;
      b.addEventListener("click", () => handleUserInput(t));
      suggestEl.appendChild(b);
    });
  }

  // Flow state
  let flow = null;
  let step = 0;
  let ctx = {}; // temporary conversation data

  // Click to toggle
  btn.addEventListener("click", () => {
    win.style.display = win.style.display === "none" ? "flex" : "none";
    if (win.style.display !== "none" && messagesEl.children.length === 0) showWelcome();
  });
  document.getElementById("bchat-close").addEventListener("click", () => {
    win.style.display = "none";
  });

  // send by button or Enter
  sendEl.addEventListener("click", () => {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = "";
    handleUserInput(text);
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendEl.click();
    }
  });

  async function handleUserInput(raw) {
    pushMessage("user", raw);

    const text = raw.toLowerCase().trim();

    // If no active flow, detect intent
    if (!flow) {
      if (text.includes("need") || text.includes("blood")) {
        flow = "need_blood"; step = 0; ctx = {};
        pushMessage("bot", "Okay — what blood group is required? (e.g. A+)");
        return;
      }
      if (text.includes("donate")) {
        flow = "donate"; step = 0; ctx = {};
        pushMessage("bot", "Great! What's your full name?");
        return;
      }
      if (text.startsWith("track")) {
        const parts = text.split(" ");
        const id = parts[1] || "";
        if (!id) {
          pushMessage("bot", "Please send the request ID after 'track'. Example: `track 60a6...`");
          return;
        }
        pushMessage("bot", "Looking up request...");
        try {
          const res = await axios.get(`${API_BASE}/api/requests/${id}`);
          const r = res.data;
          pushMessage("bot", `Status: ${r.status}. Blood: ${r.requiredBloodGroup}. Hospital: ${r.hospitalName}, ${r.city}`);
        } catch (err) {
          console.error(err);
          pushMessage("bot", "Could not find that request ID. Check and try again.");
        }
        return;
      }

      // fallback
      pushMessage("bot", "Sorry, I didn't understand. Try: 'need blood', 'donate', or 'track [id]'.");
      renderQuick(["need blood", "donate", "track request"]);
      return;
    }

    // FLOW: need_blood (creates a request)
    if (flow === "need_blood") {
      if (step === 0) {
        ctx.requiredBloodGroup = raw.trim();
        step = 1;
        pushMessage("bot", "Which city is the patient in?");
        return;
      }
      if (step === 1) {
        ctx.city = raw.trim();
        step = 2;
        pushMessage("bot", "Hospital name?");
        return;
      }
      if (step === 2) {
        ctx.hospitalName = raw.trim();
        step = 3;
        pushMessage("bot", "Contact number for the hospital or family?");
        return;
      }
      if (step === 3) {
        ctx.contactNumber = raw.trim();
        // set urgency default to urgent
        ctx.urgency = "urgent";
        pushMessage("bot", "Creating request now...");
        try {
          const res = await axios.post(`${API_BASE}/api/requests`, ctx);
          const id = res.data?.request?._id || (res.data?.request && res.data.request._id) || (res.data && res.data.request && res.data.request._id);
          pushMessage("bot", `Done — request created. ID: ${res.data.request._id || res.data.request?._id}`);
        } catch (err) {
          console.error(err);
          pushMessage("bot", "Error creating request. You can try the 'Need Blood' page on the site.");
        } finally {
          flow = null; step = 0; ctx = {};
          renderQuick(["need blood", "donate", "track request"]);
        }
        return;
      }
    }

    // FLOW: donate (register donor)
    if (flow === "donate") {
      if (step === 0) {
        ctx.name = raw.trim(); step = 1; pushMessage("bot", "City?"); return;
      }
      if (step === 1) {
        ctx.city = raw.trim(); step = 2; pushMessage("bot", "Area / landmark? (or 'skip')"); return;
      }
      if (step === 2) {
        ctx.area = raw.trim().toLowerCase() === "skip" ? "" : raw.trim(); step = 3; pushMessage("bot", "Phone number?"); return;
      }
      if (step === 3) {
        ctx.phone = raw.trim(); step = 4; pushMessage("bot", "Blood group (e.g. O+)?"); return;
      }
      if (step === 4) {
        ctx.bloodGroup = raw.trim();
        // create donor
        pushMessage("bot", "Registering you as a donor...");
        try {
          const res = await axios.post(`${API_BASE}/api/donors`, ctx);
          pushMessage("bot", `Thank you ${res.data.name || ctx.name}! You are registered. You will be visible once verified by admin.`);
        } catch (err) {
          console.error(err);
          pushMessage("bot", "Error registering. Please try the 'Become Donor' page.");
        } finally {
          flow = null; step = 0; ctx = {};
          renderQuick(["need blood", "donate", "track request"]);
        }
        return;
      }
    }

    // default fallback
    pushMessage("bot", "Hmm — something unexpected happened. Starting over.");
    flow = null; step = 0; ctx = {};
    renderQuick(["need blood", "donate", "track request"]);
  }
})();
// ================= MAP FEATURE =================
const mapContainer = document.getElementById("map");

if (mapContainer) {
  // Create map
  const map = L.map("map").setView([28.6139, 77.2090], 11); // Delhi default

  // Load map tiles (FREE)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  // Try to get user's live location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.setView([lat, lng], 13);

        L.marker([lat, lng])
          .addTo(map)
          .bindPopup("📍 You are here")
          .openPopup();
      },
      () => {
        console.log("Location access denied");
      }
    );
  }
}
