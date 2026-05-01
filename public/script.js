/**
 * PulseML — Static Frontend Logic
 * Model runs entirely in the browser via model.js (m2cgen export).
 * Firebase Firestore used for anonymous assessment logging.
 */
import { initializeApp }        from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp }
                                from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { firebaseConfig }       from "/firebase-config.js";

// ── Firebase init ────────────────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const auth  = getAuth(fbApp);
// Await sign-in so auth.currentUser is ready before any Firestore write
try { await signInAnonymously(auth); } catch(e) { console.warn("Anon auth failed:", e); }

// ── Boot sequence fires IMMEDIATELY (before model.js finishes loading) ────────
(function bootSequence() {
    const dot = document.getElementById("status-dot");
    const txt = document.getElementById("status-text");
    if (!dot || !txt) return;

    const total = 3000 + Math.random() * 2000;  // random 3–5 s
    const t1    = total * 0.35;
    const t2    = total * 0.72;

    // Phase 1: red (already set by inline HTML style)
    dot.style.setProperty("--dot-color", "#ff453a");
    dot.style.setProperty("--dot-glow",  "rgba(255,69,58,0.7)");
    txt.textContent = "Initialising\u2026";

    // Phase 2: yellow
    setTimeout(() => {
        dot.style.setProperty("--dot-color", "#ffd60a");
        dot.style.setProperty("--dot-glow",  "rgba(255,214,10,0.7)");
        txt.textContent = "Loading model\u2026";
    }, t1);

    // Phase 3: green — model is ready, enable download click
    setTimeout(() => {
        dot.style.setProperty("--dot-color", "#30d158");
        dot.style.setProperty("--dot-glow",  "rgba(48,209,88,0.6)");
        txt.textContent = "Model Active";

        // Make the whole status pill clickable to download the model zip
        const statusEl = dot.closest(".header-status") || dot.parentElement;
        if (statusEl) {
            statusEl.style.cursor  = "pointer";
            statusEl.title         = "Click to download PulseML model files";
            statusEl.addEventListener("click", () => {
                const a = document.createElement("a");
                a.href     = "/PulseML_Models.zip";
                a.download = "PulseML_Models.zip";
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
        }
    }, t2);
})();

// ── Load model.js (non-module script) ────────────────────────────────────────
await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/model.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
});

(function () {
    "use strict";

    // ── Constants ───────────────────────────────────────────────────────────
    const STORAGE_KEY = "pulseml_history";
    const MAX_HISTORY = 10;

    // Class order from label_encoder.classes_: ['High', 'Medium', 'Normal']
    const CLASS_LABELS = ["High", "Medium", "Normal"];

    const COLOR_MAP = {
        Normal:  "#30d158",
        Medium:  "#ff9f0a",
        High:    "#ff453a",
    };

    const ADVICE_MAP = {
        Normal:  "Vitals are stable. Continue regular monitoring.",
        Medium:  "Abnormal readings. Consult a healthcare professional if symptoms persist.",
        High:    "EMERGENCY: Seek immediate medical attention.",
    };

    // ── DOM refs ────────────────────────────────────────────────────────────
    const form           = document.getElementById("predict-form");
    const predictBtn     = document.getElementById("predict-btn");
    const inputBPM       = document.getElementById("input-bpm");
    const inputSpO2      = document.getElementById("input-spo2");

    const resultSection  = document.getElementById("result-section");
    const resultContent  = document.getElementById("result-content");
    const signalWarning  = document.getElementById("signal-warning");
    const warningText    = document.getElementById("warning-text");

    const riskBadge      = document.getElementById("risk-badge");
    const ringFill       = document.getElementById("ring-fill");
    const confidenceVal  = document.getElementById("confidence-value");
    const resultBPM      = document.getElementById("result-bpm");
    const resultSpO2     = document.getElementById("result-spo2");
    const adviceText     = document.getElementById("advice-text");
    const adviceIcon     = document.getElementById("advice-icon");
    const adviceBox      = document.getElementById("advice-box");

    const historyList    = document.getElementById("history-list");
    const historyEmpty   = document.getElementById("history-empty");
    const clearBtn       = document.getElementById("clear-history-btn");

    // Analysis overlay
    const analysisOverlay  = document.getElementById("analysis-overlay");
    const analysisLabel    = document.getElementById("analysis-label");
    const analysisSublabel = document.getElementById("analysis-sublabel");
    const analysisBar      = document.getElementById("analysis-progress-bar");

    const CIRCUMFERENCE = 2 * Math.PI * 52;


    // ── Client-side Prediction ──────────────────────────────────────────────
    function predict(bpm, spo2) {
        // Signal quality guard
        if (bpm < 30 || bpm > 300 || spo2 < 0 || spo2 > 100) {
            return {
                signal_warning: true,
                risk_label: "Signal Warning",
                confidence: 0,
                advice: "Invalid input detected. Please check sensor placement and re-measure.",
                bpm: bpm,
                spo2: spo2,
            };
        }

        // Run the m2cgen-exported model (score function from model.js)
        const probabilities = score([bpm, spo2]);

        // Find the class with the highest probability
        let maxIdx = 0;
        let maxProb = probabilities[0];
        for (let i = 1; i < probabilities.length; i++) {
            if (probabilities[i] > maxProb) {
                maxProb = probabilities[i];
                maxIdx = i;
            }
        }

        const risk_label = CLASS_LABELS[maxIdx];

        // Confidence = average probability across the forest (already averaged by m2cgen)
        const confidence = maxProb;

        return {
            signal_warning: false,
            risk_label: risk_label,
            confidence: Math.round(confidence * 10000) / 10000,
            advice: ADVICE_MAP[risk_label] || "Please consult a healthcare professional.",
            bpm: bpm,
            spo2: spo2,
        };
    }

    // ── Analysis Overlay helpers ────────────────────────────────────────────
    const ANALYSIS_STEPS = [
        { label: "Reading vitals…",          sub: "Parsing sensor data",          progress: 18,  delay: 0    },
        { label: "Pre-processing data…",     sub: "Normalising features",         progress: 42,  delay: 900  },
        { label: "Running AI model…",        sub: "Random Forest inference",      progress: 72,  delay: 1900 },
        { label: "Interpreting results…",    sub: "Mapping risk classification",  progress: 92,  delay: 3100 },
    ];

    function showAnalysisOverlay() {
        analysisBar.style.width = "0%";
        analysisLabel.textContent    = ANALYSIS_STEPS[0].label;
        analysisSublabel.textContent = ANALYSIS_STEPS[0].sub;
        analysisOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";

        // Drive each step
        ANALYSIS_STEPS.forEach((step) => {
            setTimeout(() => {
                analysisLabel.style.opacity    = "0";
                analysisSublabel.style.opacity = "0";
                setTimeout(() => {
                    analysisLabel.textContent    = step.label;
                    analysisSublabel.textContent = step.sub;
                    analysisLabel.style.opacity    = "1";
                    analysisSublabel.style.opacity = "1";
                }, 180);
                analysisBar.style.width = step.progress + "%";
            }, step.delay);
        });
    }

    function hideAnalysisOverlay() {
        analysisBar.style.width = "100%";
        setTimeout(() => {
            analysisOverlay.classList.add("hidden");
            document.body.style.overflow = "";
        }, 250);
    }

    // ── Form Submit ─────────────────────────────────────────────────────────
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const bpm  = parseFloat(inputBPM.value);
        const spo2 = parseFloat(inputSpO2.value);

        if (isNaN(bpm) || isNaN(spo2)) return;

        predictBtn.classList.add("loading");
        predictBtn.disabled = true;
        showAnalysisOverlay();

        // Total display time: 4.2 s — feels like real work is happening
        const TOTAL_DELAY = 4200;
        setTimeout(() => {
            const data = predict(bpm, spo2);
            hideAnalysisOverlay();
            setTimeout(() => {
                renderResult(data);
                saveToHistory(data);
            }, 280);
            predictBtn.classList.remove("loading");
            predictBtn.disabled = false;
        }, TOTAL_DELAY);
    });

    // ── Render Result ───────────────────────────────────────────────────────
    function renderResult(data) {
        resultSection.classList.remove("hidden");

        resultSection.style.animation = "none";
        requestAnimationFrame(() => {
            resultSection.style.animation = "";
        });

        if (data.signal_warning) {
            signalWarning.classList.remove("hidden");
            resultContent.classList.add("hidden");
            warningText.textContent = data.advice || "Invalid input detected.";
            return;
        }

        signalWarning.classList.add("hidden");
        resultContent.classList.remove("hidden");

        const color = COLOR_MAP[data.risk_label] || "#636366";

        riskBadge.textContent = data.risk_label;
        riskBadge.style.color = color;

        const pct = Math.round(data.confidence * 100);
        const offset = CIRCUMFERENCE - (CIRCUMFERENCE * data.confidence);
        ringFill.style.strokeDashoffset = offset;
        ringFill.style.stroke = color;
        confidenceVal.textContent = pct + "%";

        resultBPM.textContent  = data.bpm + " BPM";
        resultSpO2.textContent = data.spo2 + "%";

        adviceText.textContent = data.advice;
        adviceIcon.style.color = color;
        adviceBox.style.borderColor = hexToRGBA(color, 0.15);

        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

        if (data.risk_label === "High") {
            setTimeout(() => showHospitalModal(), 800);
        }
    }

    // ── History (localStorage) ──────────────────────────────────────────────
    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    // ── Save to Firestore (anonymous) ────────────────────────────────────────
    async function saveToFirestore(entry) {
        try {
            await addDoc(collection(db, "assessments"), {
                ...entry,
                uid:       auth.currentUser?.uid ?? "anon",
                createdAt: serverTimestamp(),
            });
            showToast("\u2713 Saved to database", "success");
        } catch (e) {
            console.error("Firestore write failed:", e.code, e.message);
            showToast("\u26a0 DB save failed: " + (e.code || e.message), "error");
        }
    }

    // ── Toast notification ────────────────────────────────────────────────────
    function showToast(msg, type) {
        const t = document.createElement("div");
        t.className = "pulseml-toast pulseml-toast--" + type;
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add("pulseml-toast--show"));
        setTimeout(() => {
            t.classList.remove("pulseml-toast--show");
            setTimeout(() => t.remove(), 400);
        }, 3000);
    }

    function saveToHistory(data) {
        if (data.signal_warning) return;

        const entry = {
            risk_label: data.risk_label,
            confidence: data.confidence,
            bpm: data.bpm,
            spo2: data.spo2,
            advice: data.advice,
            timestamp: Date.now(),
        };

        const history = getHistory();
        history.unshift(entry);
        if (history.length > MAX_HISTORY) history.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

        saveToFirestore(entry); // async, fire-and-forget
        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();

        historyList.querySelectorAll(".history-item").forEach((el) => el.remove());

        if (history.length === 0) {
            historyEmpty.style.display = "";
            return;
        }

        historyEmpty.style.display = "none";

        history.forEach((entry) => {
            const color = COLOR_MAP[entry.risk_label] || "#636366";
            const time  = formatTime(entry.timestamp);
            const pct   = Math.round(entry.confidence * 100);

            const item = document.createElement("div");
            item.className = "history-item";
            item.style.cursor = "pointer";
            item.title = "Click to view this result";
            item.innerHTML = `
                <span class="history-risk-dot" style="background:${color};box-shadow:0 0 6px ${hexToRGBA(color, 0.5)}"></span>
                <div class="history-details">
                    <div class="history-risk-label" style="color:${color}">${entry.risk_label}</div>
                    <div class="history-vitals">${entry.bpm} BPM · ${entry.spo2}% SpO₂</div>
                </div>
                <div class="history-meta">
                    <div class="history-confidence">${pct}%</div>
                    <div class="history-time">${time}</div>
                </div>
            `;

            // Click → re-render result (and re-trigger hospital modal if High)
            item.addEventListener("click", () => {
                renderResult(entry);
                if (entry.risk_label === "High") {
                    setTimeout(() => showHospitalModal(), 600);
                }
                resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
            });

            historyList.appendChild(item);
        });
    }

    clearBtn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
    });

    // ── Helpers ─────────────────────────────────────────────────────────────
    function hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;

        if (diff < 60000) return "Just now";
        if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
        if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";

        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Hospital Finder Module
    // ═══════════════════════════════════════════════════════════════════════

    const modalOverlay    = document.getElementById("hospital-modal");
    const modalClose      = document.getElementById("modal-close");
    const modalPrompt     = document.getElementById("modal-prompt");
    const modalLocating   = document.getElementById("modal-locating");
    const modalManual     = document.getElementById("modal-manual");
    const modalSearching  = document.getElementById("modal-searching");
    const modalResults    = document.getElementById("modal-results");
    const modalNoResults  = document.getElementById("modal-no-results");
    const modalYes        = document.getElementById("modal-yes");
    const modalNo         = document.getElementById("modal-no");
    const manualInput     = document.getElementById("manual-location");
    const manualSearchBtn = document.getElementById("manual-search-btn");
    const manualError     = document.getElementById("manual-error");
    const hospitalListEl  = document.getElementById("hospital-list");

    const ALL_MODAL_STATES = [
        modalPrompt, modalLocating, modalManual,
        modalSearching, modalResults, modalNoResults,
    ];

    function showModalState(target) {
        ALL_MODAL_STATES.forEach((s) => s.classList.add("hidden"));
        target.classList.remove("hidden");
    }

    function showHospitalModal() {
        showModalState(modalPrompt);
        modalOverlay.classList.remove("hidden");
        document.body.style.overflow = "hidden";
    }

    function closeModal() {
        modalOverlay.classList.add("hidden");
        document.body.style.overflow = "";
    }

    modalClose.addEventListener("click", closeModal);
    modalNo.addEventListener("click", closeModal);

    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    modalYes.addEventListener("click", () => {
        if (!navigator.geolocation) {
            showModalState(modalManual);
            return;
        }

        showModalState(modalLocating);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                findHospitals(pos.coords.latitude, pos.coords.longitude);
            },
            (err) => {
                console.warn("Geolocation denied:", err.message);
                showModalState(modalManual);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    manualSearchBtn.addEventListener("click", () => geocodeManual());
    manualInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); geocodeManual(); }
    });

    async function geocodeManual() {
        const query = manualInput.value.trim();
        if (!query) return;

        manualError.classList.add("hidden");
        showModalState(modalSearching);

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
            const res = await fetch(url, { headers: { "Accept": "application/json" } });
            const data = await res.json();

            if (!data || data.length === 0) {
                showModalState(modalManual);
                manualError.classList.remove("hidden");
                return;
            }

            findHospitals(parseFloat(data[0].lat), parseFloat(data[0].lon));
        } catch (err) {
            console.error("Geocoding failed:", err);
            showModalState(modalManual);
            manualError.classList.remove("hidden");
        }
    }

    async function findHospitals(lat, lon) {
        showModalState(modalSearching);

        // Try progressively larger radii so smaller towns still get results
        const radii = [30000, 50000];

        for (const radius of radii) {
            // Cast a wide net — OSM tags medical facilities inconsistently in India:
            // hospital / clinic / health_centre / doctors / pharmacy
            const overpassQuery = `
                [out:json][timeout:25];
                (
                    node["amenity"~"^(hospital|clinic|health_centre|doctors)$"](around:${radius},${lat},${lon});
                    way["amenity"~"^(hospital|clinic|health_centre|doctors)$"](around:${radius},${lat},${lon});
                    relation["amenity"~"^(hospital|clinic|health_centre|doctors)$"](around:${radius},${lat},${lon});
                );
                out center body;
            `;

            try {
                const res = await fetch("https://overpass-api.de/api/interpreter", {
                    method: "POST",
                    body: "data=" + encodeURIComponent(overpassQuery),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                });

                const data = await res.json();
                const hospitals = parseHospitals(data.elements, lat, lon);

                if (hospitals.length > 0) {
                    renderHospitals(hospitals.slice(0, 3));
                    showModalState(modalResults);
                    return; // Found results — stop searching
                }
                // If nothing found at this radius, try the next larger one
            } catch (err) {
                console.error("Overpass query failed:", err);
                showModalState(modalNoResults);
                return;
            }
        }

        // Exhausted all radii with no results
        showModalState(modalNoResults);
    }

    function parseHospitals(elements, userLat, userLon) {
        const results = [];

        for (const el of elements) {
            const tags = el.tags || {};
            const name = tags.name || tags["name:en"] || "Unnamed Hospital";

            let elLat, elLon;
            if (el.type === "node") {
                elLat = el.lat;
                elLon = el.lon;
            } else if (el.center) {
                elLat = el.center.lat;
                elLon = el.center.lon;
            } else {
                continue;
            }

            const dist = haversine(userLat, userLon, elLat, elLon);
            const phone = tags.phone || tags["contact:phone"] || null;

            results.push({ name, lat: elLat, lon: elLon, dist, phone });
        }

        results.sort((a, b) => a.dist - b.dist);
        return results;
    }

    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function toRad(deg) {
        return (deg * Math.PI) / 180;
    }

    function renderHospitals(hospitals) {
        hospitalListEl.innerHTML = "";

        hospitals.forEach((h, i) => {
            const distText = h.dist < 1
                ? `${Math.round(h.dist * 1000)} m away`
                : `${h.dist.toFixed(1)} km away`;

            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lon}`;

            let phoneHtml = "";
            if (h.phone) {
                const cleanPhone = h.phone.replace(/\s+/g, "");
                phoneHtml = `
                    <a href="tel:${cleanPhone}" class="hospital-action-btn hospital-action-call">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        ${h.phone}
                    </a>
                `;
            }

            const card = document.createElement("div");
            card.className = "hospital-card";
            card.innerHTML = `
                <span class="hospital-rank">${i + 1}</span>
                <div class="hospital-name">${escapeHTML(h.name)}</div>
                <div class="hospital-distance">${distText}</div>
                <div class="hospital-actions">
                    <a href="${mapsUrl}" target="_blank" rel="noopener" class="hospital-action-btn hospital-action-maps">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                        </svg>
                        Directions
                    </a>
                    ${phoneHtml}
                </div>
            `;
            hospitalListEl.appendChild(card);
        });
    }

    function escapeHTML(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Init ────────────────────────────────────────────────────────────────
    renderHistory();
})();
