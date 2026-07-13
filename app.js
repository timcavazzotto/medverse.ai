// ---------- Helpers ----------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function confClass(text) {
  if (!text) return "conf-inferida";
  const t = text.toLowerCase();
  if (t.startsWith("alta")) return "conf-alta";
  if (t.startsWith("média") || t.startsWith("media")) return "conf-media";
  return "conf-inferida";
}

function confLabel(text) {
  if (!text) return "Inferida";
  const t = text.toLowerCase();
  if (t.startsWith("alta")) return "Confiança alta";
  if (t.startsWith("média") || t.startsWith("media")) return "Confiança média";
  return "Confiança inferida";
}

// Ano de referência (primeira aprovação regulatória relevante ou lançamento
// do produto/empresa) para cada ficha verificada. Usado apenas no eixo do
// gráfico de dispersão — ver metodologia no rodapé do site para fontes.
const YEAR_BY_NAME = {
  "Aidoc (CARE)": 2026,
  "Viz.ai": 2018,
  "Qure.ai (qXR)": 2026,
  "Lunit INSIGHT CXR": 2021,
  "Eko (Sensora / CORE 500)": 2025,
  "EchoNext": 2026,
  "HeartFlow (FFR-CT)": 2016,
  "EyeArt": 2020,
  "LumineticsCore (ex-IDx-DR)": 2018,
  "AEYE-DS": 2022,
  "Paige (Prostate Detect / Predict)": 2021,
  "PathAI (AISight Dx)": 2025,
  "Abridge": 2018,
  "Dragon Copilot (ex-Nuance DAX)": 2020,
  "Suki AI": 2017,
  "Freed": 2023,
  "Heidi Health": 2024,
  "DermaSensor": 2024,
  "Ada Health": 2016,
  "Buoy Health": 2017,
  "Wysa": 2016,
  "GI Genius": 2021,
};

// ---------- Área: normalização para permitir comparar Tier1 x Tier2 ----------
function normalizeArea(raw) {
  if (!raw) return "Outra";
  if (raw.includes("Cardiolog")) return "Cardiologia";
  if (raw.includes("Oftalmolog")) return "Oftalmologia";
  if (raw.includes("Patologia")) return "Patologia digital";
  if (raw.includes("Gastroenterolog")) return "Gastroenterologia / Urologia";
  if (raw.includes("Radiolog")) return "Radiologia";
  if (raw.includes("Documentação clínica")) return "Documentação clínica (IA de apoio)";
  if (raw.includes("Dermatolog")) return "Dermatologia";
  if (raw.includes("Triagem de sintomas")) return "Triagem de sintomas";
  if (raw.includes("Saúde mental")) return "Saúde mental";
  return raw;
}

function yearFromFdaDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const y = parseInt(parts[2], 10);
  return Number.isFinite(y) ? y : null;
}

// Simple deterministic pseudo-random jitter so re-renders are stable
function seededJitter(seedStr) {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) % 1000;
  return (h / 1000) - 0.5; // range -0.5..0.5
}

function buildScatterPoints() {
  const points = [];
  TIER2.forEach(t => {
    const year = yearFromFdaDate(t["Date of Final Decision"]);
    if (!year) return;
    points.push({
      area: t.area_pt || "Outra",
      year,
      curated: false,
      label: `${t.Device} — ${t.Company} (${year})`,
    });
  });
  TIER1.forEach(t => {
    const year = YEAR_BY_NAME[t.Nome];
    if (!year) return;
    points.push({
      area: normalizeArea(t["Área Clínica"]),
      year,
      curated: true,
      label: `${t.Nome} — ${t["Empresa / Desenvolvedor"]} (${year})`,
    });
  });
  return points;
}

// ---------- Dashboard: scatter (área × ano), FDA em cinza + curadas em azul ----------
function renderScatter() {
  const points = buildScatterPoints();

  // Eixo ordinal: cada ano presente nos dados recebe largura igual,
  // independentemente da distância real entre eles. Isso condensa o
  // gráfico horizontalmente em vez de "esticar" anos sem nenhum dado.
  const yearSet = [...new Set(points.map(p => p.year))].sort((a, b) => a - b);
  const yearIndex = Object.fromEntries(yearSet.map((y, i) => [y, i]));
  const lastIdx = yearSet.length - 1 || 1;
  const xPct = (year) => (yearIndex[year] / lastIdx) * 100;

  // Agrupa por área e ordena por volume total (maior primeiro)
  const byArea = {};
  points.forEach(p => {
    (byArea[p.area] = byArea[p.area] || []).push(p);
  });
  const areas = Object.keys(byArea).sort((a, b) => byArea[b].length - byArea[a].length);

  const scatter = $("#scatter");
  scatter.innerHTML = "";

  areas.forEach(area => {
    const areaPoints = byArea[area];
    const curatedCount = areaPoints.filter(p => p.curated).length;

    const row = document.createElement("div");
    row.className = "scatter-row";
    const track = document.createElement("div");
    track.className = "scatter-track";

    // Cinza primeiro (fica embaixo), azul depois (fica em cima, no DOM)
    areaPoints.filter(p => !p.curated).forEach(p => {
      const pct = xPct(p.year);
      const jitter = seededJitter(p.label + p.year) * 68; // % do track
      const dot = document.createElement("div");
      dot.className = "scatter-dot uncurated";
      dot.style.left = `${pct}%`;
      dot.style.top = `calc(50% + ${jitter}%)`;
      dot.title = p.label;
      track.appendChild(dot);
    });
    areaPoints.filter(p => p.curated).forEach(p => {
      const pct = xPct(p.year);
      const dot = document.createElement("div");
      dot.className = "scatter-dot curated";
      dot.style.left = `${pct}%`;
      dot.style.top = `50%`;
      dot.title = p.label;
      track.appendChild(dot);
    });

    row.innerHTML = `<div class="scatter-label">${area} <b>(${curatedCount}/${areaPoints.length})</b></div>`;
    row.appendChild(track);
    scatter.appendChild(row);
  });

  // Axis (posições ordinais, um tick por ano presente nos dados)
  const axis = document.createElement("div");
  axis.className = "scatter-axis";
  const axisTrack = document.createElement("div");
  axisTrack.className = "scatter-axis-track";
  yearSet.forEach(y => {
    const tick = document.createElement("span");
    tick.className = "scatter-axis-tick";
    tick.style.left = `${xPct(y)}%`;
    tick.textContent = y;
    axisTrack.appendChild(tick);
  });
  axis.innerHTML = `<div></div>`;
  axis.appendChild(axisTrack);
  scatter.appendChild(axis);
}

// ---------- Tier 1 filters + cards ----------
let activeArea = null;

function uniqueAreas() {
  return [...new Set(TIER1.map(t => t["Área Clínica"]))];
}

function renderChips() {
  const areaWrap = $("#area-chips");
  areaWrap.innerHTML = "";
  const allChip = document.createElement("button");
  allChip.className = "chip active";
  allChip.textContent = "Todas as áreas";
  allChip.onclick = () => { activeArea = null; refreshChipState(); renderCards(); };
  areaWrap.appendChild(allChip);
  uniqueAreas().forEach(area => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = area;
    chip.onclick = () => { activeArea = area; refreshChipState(); renderCards(); };
    areaWrap.appendChild(chip);
  });
}

function refreshChipState() {
  const areaChips = $$("#area-chips .chip");
  areaChips.forEach(c => c.classList.remove("active"));
  areaChips[0].classList.toggle("active", !activeArea);
  areaChips.forEach(c => { if (c.textContent === activeArea) c.classList.add("active"); });
}

function renderCards() {
  const query = $("#search").value.trim().toLowerCase();
  const grid = $("#cards");
  grid.innerHTML = "";
  const filtered = TIER1.filter(t => {
    if (activeArea && t["Área Clínica"] !== activeArea) return false;
    if (query) {
      const haystack = `${t.Nome} ${t["Empresa / Desenvolvedor"]} ${t["Função"]}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  $("#empty-state").hidden = filtered.length > 0;

  filtered.forEach(t => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${t.Nome}</h3>
          <p class="company">${t["Empresa / Desenvolvedor"]}</p>
        </div>
        <span class="area-tag">${t["Área Clínica"]}</span>
      </div>
      <p class="func">${t["Função"]}</p>
      <p class="tech">${(t["Fase / Tecnologia de IA"] || "").split(" — ")[0]}</p>
      <div class="card-footer">
        <span>${YEAR_BY_NAME[t.Nome] || ""}</span>
        <a href="${t["Link Oficial"]}" target="_blank" rel="noopener">site oficial &rarr;</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  renderScatter();
  renderChips();
  renderCards();

  $("#search").addEventListener("input", renderCards);
});
