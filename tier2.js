const $ = (sel, ctx = document) => ctx.querySelector(sel);

function renderTier2Controls() {
  const select = $("#area2-select");
  const areas = [...new Set(TIER2.map(t => t.area_pt))].sort();
  select.innerHTML = `<option value="">Todas as áreas (FDA)</option>` +
    areas.map(a => `<option value="${a}">${a}</option>`).join("");
}

function renderTier2Table() {
  const query = $("#search2").value.trim().toLowerCase();
  const areaFilter = $("#area2-select").value;
  const body = $("#tier2-body");
  body.innerHTML = "";

  const filtered = TIER2.filter(t => {
    if (areaFilter && t.area_pt !== areaFilter) return false;
    if (query) {
      const haystack = `${t.Device} ${t.Company}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  filtered.slice(0, 400).forEach(t => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${t.Device}</td>
      <td>${t.Company}</td>
      <td>${t.area_pt}</td>
      <td>${t["Date of Final Decision"]}</td>
      <td><a href="${t.link}" target="_blank" rel="noopener">${t["Submission Number"]}</a></td>
    `;
    body.appendChild(tr);
  });

  $("#tier2-count").textContent =
    `Mostrando ${Math.min(filtered.length, 400)} de ${filtered.length} resultado(s) — catálogo total: ${TIER2.length} dispositivos.`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderTier2Controls();
  renderTier2Table();
  $("#search2").addEventListener("input", renderTier2Table);
  $("#area2-select").addEventListener("change", renderTier2Table);
});
