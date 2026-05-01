/**
 * PulseML — Frontend Logic
 * Handles predictions, result rendering, and localStorage history (last 10).
 */

(function () {
    "use strict";

    // ── Constants ───────────────────────────────────────────────────────────
    const STORAGE_KEY = "pulseml_history";
    const MAX_HISTORY = 10;

    const COLOR_MAP = {
        Normal:  "#30d158",
        Low:     "#ffd60a",
        Medium:  "#ff9f0a",
        High:    "#ff453a",
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

    // Ring circumference (2 * π * r=52)
    const CIRCUMFERENCE = 2 * Math.PI * 52;  // ≈ 326.73

    // ── Prediction Request ──────────────────────────────────────────────────
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const bpm  = parseFloat(inputBPM.value);
        const spo2 = parseFloat(inputSpO2.value);

        if (isNaN(bpm) || isNaN(spo2)) return;

        predictBtn.classList.add("loading");
        predictBtn.disabled = true;

        try {
            const res = await fetch("/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bpm, spo2 }),
            });

            if (!res.ok) throw new Error("Server error");

            const data = await res.json();
            renderResult(data);
            saveToHistory(data);
        } catch (err) {
            console.error(err);
            alert("Prediction failed. Ensure the server is running.");
        } finally {
            predictBtn.classList.remove("loading");
            predictBtn.disabled = false;
        }
    });

    // ── Render Result ───────────────────────────────────────────────────────
    function renderResult(data) {
        resultSection.classList.remove("hidden");

        // Re-trigger animation
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

        // Risk badge
        riskBadge.textContent = data.risk_label;
        riskBadge.style.color = color;

        // Confidence ring
        const pct = Math.round(data.confidence * 100);
        const offset = CIRCUMFERENCE - (CIRCUMFERENCE * data.confidence);
        ringFill.style.strokeDashoffset = offset;
        ringFill.style.stroke = color;
        confidenceVal.textContent = pct + "%";

        // Vitals
        resultBPM.textContent  = data.bpm + " BPM";
        resultSpO2.textContent = data.spo2 + "%";

        // Advice
        adviceText.textContent = data.advice;
        adviceIcon.style.color = color;
        adviceBox.style.borderColor = hexToRGBA(color, 0.15);

        // Scroll into view smoothly
        resultSection.scrollIntoView({ behavior: "smooth", block: "start" });

        // Trigger hospital popup for High risk
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

        renderHistory();
    }

    function renderHistory() {
        const history = getHistory();

        // Clear existing items (except the empty placeholder)
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

            historyList.appendChild(item);
        });
    }

    // ── Clear History ───────────────────────────────────────────────────────
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

    // ── Open / Close ────────────────────────────────────────────────────────
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

    // Close on overlay click (not on card click)
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // ── "Find Nearby Hospitals" clicked ─────────────────────────────────────
    modalYes.addEventListener("click", () => {
        if (!navigator.geolocation) {
            // Geolocation not supported → manual fallback
            showModalState(modalManual);
            return;
        }

        showModalState(modalLocating);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                findHospitals(latitude, longitude);
            },
            (err) => {
                console.warn("Geolocation denied:", err.message);
                showModalState(modalManual);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    });

    // ── Manual location search ──────────────────────────────────────────────
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
            const res = await fetch(url, {
                headers: { "Accept": "application/json" },
            });
            const data = await res.json();

            if (!data || data.length === 0) {
                showModalState(modalManual);
                manualError.classList.remove("hidden");
                return;
            }

            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            findHospitals(lat, lon);
        } catch (err) {
            console.error("Geocoding failed:", err);
            showModalState(modalManual);
            manualError.classList.remove("hidden");
        }
    }

    // ── Overpass API: Find hospitals ─────────────────────────────────────────
    async function findHospitals(lat, lon) {
        showModalState(modalSearching);

        // Search within 10 km radius
        const radius = 10000;
        const overpassQuery = `
            [out:json][timeout:15];
            (
                node["amenity"="hospital"](around:${radius},${lat},${lon});
                way["amenity"="hospital"](around:${radius},${lat},${lon});
                relation["amenity"="hospital"](around:${radius},${lat},${lon});
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

            if (hospitals.length === 0) {
                showModalState(modalNoResults);
                return;
            }

            renderHospitals(hospitals.slice(0, 3));
            showModalState(modalResults);
        } catch (err) {
            console.error("Overpass query failed:", err);
            showModalState(modalNoResults);
        }
    }

    // ── Parse + sort hospitals by distance ──────────────────────────────────
    function parseHospitals(elements, userLat, userLon) {
        const results = [];

        for (const el of elements) {
            const tags = el.tags || {};
            const name = tags.name || tags["name:en"] || "Unnamed Hospital";

            // Get coordinates (nodes have lat/lon directly; ways/relations use center)
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

    // ── Haversine distance (km) ─────────────────────────────────────────────
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

    // ── Render hospital cards ───────────────────────────────────────────────
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

    // ── Init: load cached history on page load ──────────────────────────────
    renderHistory();
})();
