const API_BASE = `${window.location.origin}/api`;

let currentPage = 1;
let currentFilters = {
  search: '',
  jurisdiction: [],
  stage: [],
  minRisk: 1,
  maxRisk: 5,
  ageBracket: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'updated',
  under16Only: false,
};

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? 'var(--danger)' : 'var(--primary)';
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3500);
}

async function apiJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    let message = `${response.status}`;
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function chili(score) {
  const safe = Math.max(1, Math.min(5, Number(score) || 1));
  return `${'🌶️'.repeat(safe)}${'○'.repeat(5 - safe)}`;
}

function stageLabel(stage) {
  return (stage || '').replaceAll('_', ' ');
}

function getMultiSelectValues(id) {
  const select = document.getElementById(id);
  return Array.from(select.selectedOptions).map((option) => option.value).filter(Boolean);
}

function setMultiSelectValues(id, values) {
  const select = document.getElementById(id);
  const valueSet = new Set(values || []);
  Array.from(select.options).forEach((option) => {
    option.selected = valueSet.has(option.value);
  });
}

function showPage(page) {
  document.querySelectorAll('.page').forEach((node) => node.classList.remove('active'));
  document.querySelectorAll('.tab').forEach((node) => node.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`.tab[data-page="${page}"]`).classList.add('active');

  localStorage.setItem('opencode-active-page', page);

  if (page === 'dashboard') loadDashboard();
  if (page === 'events') loadEvents(1);
  if (page === 'competitors') loadCompetitors();
  if (page === 'reports') loadReportsPane();
}

async function loadDashboard() {
  try {
    const [summary, heatmap, pipeline, trends, brief, alerts, crawlStatus] = await Promise.all([
      apiJson('/analytics/summary'),
      apiJson('/analytics/jurisdictions'),
      apiJson('/analytics/pipeline'),
      apiJson('/analytics/trends'),
      apiJson('/brief?limit=6'),
      apiJson('/alerts?limit=3'),
      apiJson('/crawl/status'),
    ]);

    document.getElementById('stat-total').textContent = summary.totalEvents || 0;
    document.getElementById('stat-avg-risk').textContent = Number(summary.averageRiskScore || 0).toFixed(2);
    document.getElementById('stat-top-jurisdiction').textContent = summary.topJurisdiction || 'N/A';
    document.getElementById('stat-newest').textContent = formatDate(summary.newestEventUpdatedAt);
    document.getElementById('last-crawled').textContent = formatDate(crawlStatus.lastCrawledAt);

    renderHeatmap(heatmap.jurisdictions || []);
    renderPipeline(pipeline.pipeline || []);
    renderTrends(trends.trends || []);
    renderBrief(brief.items || []);
    renderAlerts(alerts.items || []);
  } catch (error) {
    console.error(error);
    showToast(`Dashboard load failed: ${error.message}`, true);
  }
}

function renderHeatmap(items) {
  const container = document.getElementById('heatmap-grid');
  if (!items.length) {
    container.innerHTML = '<div class="subtle">No data</div>';
    return;
  }

  const maxRisk = Math.max(...items.map((item) => Number(item.avgRisk || 0)), 1);
  container.innerHTML = items.slice(0, 24).map((item) => {
    const ratio = Number(item.avgRisk || 0) / maxRisk;
    const red = Math.round(220 * ratio);
    const green = Math.round(180 * (1 - ratio));
    const bg = `rgba(${red}, ${green}, 70, 0.3)`;
    return `
      <div class="heat-cell" style="background:${bg}" onclick="filterJurisdictionFromHeatmap('${encodeURIComponent(item.country)}')">
        <div><strong>${item.country}</strong> ${item.flag || ''}</div>
        <div>${item.count} events</div>
        <div>${Number(item.avgRisk || 0).toFixed(2)} avg risk</div>
      </div>
    `;
  }).join('');
}

function filterJurisdictionFromHeatmap(encodedCountry) {
  const country = decodeURIComponent(encodedCountry);
  showPage('events');
  currentFilters.jurisdiction = [country];
  syncFiltersToUi();
  loadEvents(1);
}

function renderPipeline(items) {
  const container = document.getElementById('pipeline-chart');
  if (!items.length) {
    container.innerHTML = '<div class="subtle">No stage data</div>';
    return;
  }

  const max = Math.max(...items.map((item) => item.count || 0), 1);
  container.innerHTML = items.map((item) => `
    <div class="pipeline-row">
      <div>${stageLabel(item.stage)}</div>
      <div class="bar" style="width:${Math.max(5, (item.count / max) * 100)}%"></div>
      <div>${item.count} (${item.conversionRate}%)</div>
    </div>
  `).join('');
}

function renderTrends(items) {
  const container = document.getElementById('trend-chart');
  if (!items.length) {
    container.innerHTML = '<div class="subtle">No trend data</div>';
    return;
  }

  const max = Math.max(...items.map((item) => item.count || 0), 1);
  container.innerHTML = items.map((item) => `
    <div class="trend-row">
      <div>${item.month}</div>
      <div class="bar" style="width:${Math.max(5, (item.count / max) * 100)}%"></div>
      <div>${item.count} (${item.highRiskCount} high)</div>
    </div>
  `).join('');
}

function renderBrief(items) {
  const container = document.getElementById('brief-grid');
  if (!items.length) {
    container.innerHTML = '<div class="subtle">No priority items.</div>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="brief-card">
      <h3>${escapeHtml(item.title)}</h3>
      <div class="tag-row">
        <span class="tag">${escapeHtml(item.jurisdiction.flag || '🌍')} ${escapeHtml(item.jurisdiction.country)}</span>
        <span class="tag">${escapeHtml(stageLabel(item.stage))}</span>
        <span class="tag">${chili(item.scores?.chili || item.chiliScore)}</span>
      </div>
      <p>${escapeHtml(item.summary || '')}</p>
      <div class="subtle">Last crawled: ${formatDate(item.lastCrawledAt)}</div>
      <div class="action-row">
        <button class="btn" onclick="openLaw('${item.id}')">Open</button>
        ${item.source?.url ? `<a class="btn" href="${escapeHtml(item.source.url)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
      </div>
    </article>
  `).join('');
}

function renderAlerts(items) {
  const strip = document.getElementById('notification-strip');
  if (!items.length) {
    strip.classList.add('hidden');
    strip.innerHTML = '';
    return;
  }

  strip.classList.remove('hidden');
  strip.innerHTML = `<strong>Alerts:</strong> ${items.map((item) => escapeHtml(item.message)).join(' · ')}`;
}

async function loadJurisdictionOptions() {
  const select = document.getElementById('filter-jurisdiction');
  try {
    const data = await apiJson('/jurisdictions');
    const countries = data.countries || [];
    select.innerHTML = countries.map((country) =>
      `<option value="${escapeHtml(country.country)}">${escapeHtml(country.country)} (${country.count})</option>`
    ).join('');
  } catch (error) {
    console.error(error);
    select.innerHTML = '';
  }
}

function readFiltersFromUi() {
  const minRisk = Number(document.getElementById('filter-min-risk').value);
  const maxRisk = Number(document.getElementById('filter-max-risk').value);
  const [safeMin, safeMax] = minRisk <= maxRisk ? [minRisk, maxRisk] : [maxRisk, minRisk];

  currentFilters = {
    search: document.getElementById('filter-search').value.trim(),
    jurisdiction: getMultiSelectValues('filter-jurisdiction'),
    stage: getMultiSelectValues('filter-stage'),
    minRisk: safeMin,
    maxRisk: safeMax,
    ageBracket: document.getElementById('filter-age').value,
    dateFrom: document.getElementById('filter-date-from').value,
    dateTo: document.getElementById('filter-date-to').value,
    sortBy: document.getElementById('filter-sort').value,
    under16Only: document.getElementById('filter-under16-only').checked,
  };

  document.getElementById('risk-range-label').textContent = `${safeMin}-${safeMax}`;
  localStorage.setItem('opencode-filters', JSON.stringify(currentFilters));
}

function syncFiltersToUi() {
  document.getElementById('filter-search').value = currentFilters.search || '';
  setMultiSelectValues('filter-jurisdiction', currentFilters.jurisdiction || []);
  setMultiSelectValues('filter-stage', currentFilters.stage || []);
  document.getElementById('filter-min-risk').value = String(currentFilters.minRisk || 1);
  document.getElementById('filter-max-risk').value = String(currentFilters.maxRisk || 5);
  document.getElementById('risk-range-label').textContent = `${currentFilters.minRisk || 1}-${currentFilters.maxRisk || 5}`;
  document.getElementById('filter-age').value = currentFilters.ageBracket || '';
  document.getElementById('filter-date-from').value = currentFilters.dateFrom || '';
  document.getElementById('filter-date-to').value = currentFilters.dateTo || '';
  document.getElementById('filter-sort').value = currentFilters.sortBy || 'updated';
  document.getElementById('filter-under16-only').checked = Boolean(currentFilters.under16Only);
}

function applyFilters() {
  readFiltersFromUi();
  loadEvents(1);
}

function clearFilters() {
  currentFilters = {
    search: '',
    jurisdiction: [],
    stage: [],
    minRisk: 1,
    maxRisk: 5,
    ageBracket: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'updated',
    under16Only: false,
  };
  syncFiltersToUi();
  localStorage.setItem('opencode-filters', JSON.stringify(currentFilters));
  loadEvents(1);
}

async function loadEvents(page = 1) {
  currentPage = page;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '15');

  if (currentFilters.search) params.set('search', currentFilters.search);
  if (currentFilters.jurisdiction?.length) params.set('jurisdiction', currentFilters.jurisdiction.join(','));
  if (currentFilters.stage?.length) params.set('stage', currentFilters.stage.join(','));
  if (currentFilters.ageBracket) params.set('ageBracket', currentFilters.ageBracket);
  if (currentFilters.minRisk) params.set('minRisk', String(currentFilters.minRisk));
  if (currentFilters.maxRisk) params.set('maxRisk', String(currentFilters.maxRisk));
  if (currentFilters.dateFrom) params.set('dateFrom', currentFilters.dateFrom);
  if (currentFilters.dateTo) params.set('dateTo', currentFilters.dateTo);
  if (currentFilters.sortBy) params.set('sortBy', currentFilters.sortBy);
  if (currentFilters.under16Only) params.set('under16Only', 'true');

  try {
    const data = await apiJson(`/laws?${params.toString()}`);
    renderEventsTable(data.items || []);
    renderEventsPagination(data.page, data.totalPages);
    document.getElementById('events-meta').textContent = `Showing ${data.items.length} of ${data.total} laws`;
    document.getElementById('last-crawled').textContent = formatDate(data.lastCrawledAt);
  } catch (error) {
    showToast(`Events load failed: ${error.message}`, true);
    document.getElementById('events-table-wrap').innerHTML = '<div class="subtle">Failed to load events.</div>';
  }
}

function renderEventsTable(items) {
  const wrap = document.getElementById('events-table-wrap');
  if (!items.length) {
    wrap.innerHTML = '<div class="subtle">No events match your filters.</div>';
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Law</th>
          <th>Jurisdiction</th>
          <th>Stage</th>
          <th>Age</th>
          <th>Risk</th>
          <th>Updates</th>
          <th>Latest</th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td><a href="#" onclick="openLaw('${item.id}'); return false;">${escapeHtml(item.title)}</a></td>
            <td>${escapeHtml(item.jurisdiction.flag || '🌍')} ${escapeHtml(item.jurisdiction.country)}${item.jurisdiction.state ? `, ${escapeHtml(item.jurisdiction.state)}` : ''}</td>
            <td><span class="tag">${escapeHtml(stageLabel(item.stage))}</span></td>
            <td>${escapeHtml(item.ageBracket || 'unknown')}</td>
            <td>${chili(item.scores?.chili)}</td>
            <td>${escapeHtml(String(item.updateCount || 0))}</td>
            <td>${formatDate(item.latestUpdateAt || item.updatedAt)}</td>
            <td>${item.source?.url ? `<a href="${escapeHtml(item.source.url)}" target="_blank" rel="noopener">link ↗</a>` : '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderEventsPagination(page, totalPages) {
  const container = document.getElementById('events-pagination');
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const buttons = [];
  if (page > 1) buttons.push(`<button onclick="loadEvents(${page - 1})">← Prev</button>`);

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  for (let i = start; i <= end; i += 1) {
    buttons.push(`<button class="${i === page ? 'active' : ''}" onclick="loadEvents(${i})">${i}</button>`);
  }

  if (page < totalPages) buttons.push(`<button onclick="loadEvents(${page + 1})">Next →</button>`);
  container.innerHTML = buttons.join('');
}

async function loadSavedSearches() {
  try {
    const data = await apiJson('/saved-searches');
    const select = document.getElementById('saved-searches');
    const options = ['<option value="">Saved searches...</option>'];
    data.items.forEach((item) => {
      options.push(`<option value="${item.id}" data-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`);
    });
    select.innerHTML = options.join('');
    select.dataset.items = JSON.stringify(data.items);
  } catch (error) {
    console.error(error);
  }
}

async function saveCurrentSearch() {
  readFiltersFromUi();
  const name = window.prompt('Save search as:');
  if (!name) return;

  try {
    await apiJson('/saved-searches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, filters: currentFilters }),
    });
    showToast('Saved search stored.');
    loadSavedSearches();
  } catch (error) {
    showToast(`Save failed: ${error.message}`, true);
  }
}

function loadSavedSearch() {
  const select = document.getElementById('saved-searches');
  if (!select.value) return;
  const items = JSON.parse(select.dataset.items || '[]');
  const selected = items.find((item) => String(item.id) === String(select.value));
  if (!selected) return;

  currentFilters = {
    ...currentFilters,
    ...selected.filters,
  };
  syncFiltersToUi();
  loadEvents(1);
}

async function deleteSavedSearch() {
  const select = document.getElementById('saved-searches');
  if (!select.value) return;

  try {
    await apiJson(`/saved-searches/${select.value}`, { method: 'DELETE' });
    showToast('Saved search deleted.');
    loadSavedSearches();
  } catch (error) {
    showToast(`Delete failed: ${error.message}`, true);
  }
}

async function openLaw(lawId) {
  try {
    const law = await apiJson(`/laws/${lawId}`);
    const dialog = document.getElementById('event-dialog');

    document.getElementById('event-dialog-body').innerHTML = `
      <h3>${escapeHtml(law.title)}</h3>
      <div class="event-detail-grid">
        <div class="detail-item"><div class="label">Jurisdiction</div>${escapeHtml(law.jurisdiction.country)}${law.jurisdiction.state ? `, ${escapeHtml(law.jurisdiction.state)}` : ''}</div>
        <div class="detail-item"><div class="label">Stage</div>${escapeHtml(stageLabel(law.stage))}</div>
        <div class="detail-item"><div class="label">Risk</div>${chili(law.scores?.chili)}</div>
        <div class="detail-item"><div class="label">Age Bracket</div>${escapeHtml(law.ageBracket || 'unknown')}</div>
        <div class="detail-item"><div class="label">Update Count</div>${escapeHtml(String(law.updateCount || 0))}</div>
        <div class="detail-item"><div class="label">Latest Update</div>${formatDate(law.latestUpdateAt)}</div>
        <div class="detail-item full"><div class="label">Summary</div>${escapeHtml(law.summary || '')}</div>
        <div class="detail-item full"><div class="label">Business Impact</div>${escapeHtml(law.businessImpact || '')}</div>
        <div class="detail-item full"><div class="label">Update Timeline</div>${(law.updateTimeline || []).map((t) => `${escapeHtml(stageLabel(t.stage || 'unknown'))} • ${formatDate(t.publishedDate || t.capturedAt)} • ${chili(t.scores?.chili || 1)}<br>${escapeHtml(t.summary || '')}`).join('<br><br>') || 'None'}</div>
        <div class="detail-item full"><div class="label">Related Laws</div>${(law.relatedLaws || []).map((related) => `<a href="#" onclick="openLaw('${related.id}'); return false;">${escapeHtml(related.title)}</a>`).join('<br>') || 'None'}</div>
      </div>
    `;

    dialog.showModal();
  } catch (error) {
    showToast(`Failed to open law: ${error.message}`, true);
  }
}

async function saveEventEdits(eventId) {
  try {
    await apiJson(`/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: document.getElementById('edit-title').value,
        stage: document.getElementById('edit-stage').value,
        ageBracket: document.getElementById('edit-age-bracket').value,
        summary: document.getElementById('edit-summary').value,
        businessImpact: document.getElementById('edit-impact').value,
      }),
    });
    showToast('Event updated.');
    loadEvents(currentPage);
    loadDashboard();
  } catch (error) {
    showToast(`Update failed: ${error.message}`, true);
  }
}

async function submitFeedback(eventId, rating) {
  const note = window.prompt('Optional note for feedback:') || '';
  try {
    await apiJson(`/events/${eventId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, note }),
    });
    showToast('Feedback submitted.');
  } catch (error) {
    showToast(`Feedback failed: ${error.message}`, true);
  }
}

async function runCrawl() {
  const button = document.getElementById('crawl-btn');
  button.disabled = true;
  button.textContent = '⏳ Crawling...';

  try {
    const result = await apiJson('/crawl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    showToast(`Crawl ${result.status}. Saved ${result.itemsSaved} items.`);
    await Promise.all([loadDashboard(), loadEvents(currentPage)]);
  } catch (error) {
    showToast(`Crawl failed: ${error.message}`, true);
  } finally {
    button.disabled = false;
    button.textContent = '🔄 Run Crawl';
  }
}

function exportCsv() {
  readFiltersFromUi();
  const params = new URLSearchParams();
  if (currentFilters.search) params.set('search', currentFilters.search);
  if (currentFilters.jurisdiction?.length) params.set('jurisdiction', currentFilters.jurisdiction.join(','));
  if (currentFilters.stage?.length) params.set('stage', currentFilters.stage.join(','));
  if (currentFilters.ageBracket) params.set('ageBracket', currentFilters.ageBracket);
  if (currentFilters.minRisk) params.set('minRisk', String(currentFilters.minRisk));
  if (currentFilters.maxRisk) params.set('maxRisk', String(currentFilters.maxRisk));
  if (currentFilters.dateFrom) params.set('dateFrom', currentFilters.dateFrom);
  if (currentFilters.dateTo) params.set('dateTo', currentFilters.dateTo);
  if (currentFilters.under16Only) params.set('under16Only', 'true');
  window.open(`${API_BASE}/export/csv?${params.toString()}`, '_blank');
}

function exportPdf() {
  window.open(`${API_BASE}/export/pdf`, '_blank');
}

async function loadCompetitors() {
  try {
    const data = await apiJson('/competitors');
    const wrap = document.getElementById('competitor-table-wrap');
    const names = Object.keys(data.comparison || {});
    if (!names.length) {
      wrap.innerHTML = '<div class="subtle">No competitor responses available.</div>';
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Competitor</th>
            <th>Response</th>
            <th>Event</th>
            <th>Jurisdiction</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          ${names.flatMap((name) => data.comparison[name].map((entry, idx) => `
            <tr>
              ${idx === 0 ? `<td rowspan="${data.comparison[name].length}"><strong>${escapeHtml(name)}</strong></td>` : ''}
              <td>${escapeHtml(entry.response)}</td>
              <td><a href="#" onclick="openLaw('${entry.lawId}'); return false;">${escapeHtml(entry.lawTitle)}</a></td>
              <td>${escapeHtml(entry.jurisdiction)}</td>
              <td>${formatDate(entry.updatedAt)}</td>
            </tr>
          `)).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    showToast(`Competitor load failed: ${error.message}`, true);
  }
}

async function loadReportsPane() {
  try {
    const config = await apiJson('/alerts/config');
    document.getElementById('digest-email').value = config.email || '';
    document.getElementById('digest-frequency').value = config.frequency || 'daily';
    document.getElementById('digest-min-chili').value = String(config.min_chili || 4);
    document.getElementById('digest-webhook').value = config.webhook_url || '';
  } catch (error) {
    console.error(error);
  }
}

async function saveAlertConfig() {
  try {
    await apiJson('/alerts/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('digest-email').value || null,
        frequency: document.getElementById('digest-frequency').value,
        minChili: Number(document.getElementById('digest-min-chili').value),
        webhookUrl: document.getElementById('digest-webhook').value || null,
      }),
    });
    showToast('Alert config saved.');
  } catch (error) {
    showToast(`Config save failed: ${error.message}`, true);
  }
}

async function previewDigest() {
  try {
    const frequency = document.getElementById('digest-frequency').value;
    const data = await apiJson(`/email-digest/preview?frequency=${encodeURIComponent(frequency)}`);
    document.getElementById('digest-preview').textContent = data.previewText;
  } catch (error) {
    showToast(`Digest preview failed: ${error.message}`, true);
  }
}

async function downloadTrendReport() {
  try {
    const data = await apiJson('/reports/trend-analysis');
    downloadFile('trend-analysis.json', JSON.stringify(data, null, 2), 'application/json');
  } catch (error) {
    showToast(`Trend report failed: ${error.message}`, true);
  }
}

async function downloadJurisdictionReport() {
  const country = window.prompt('Jurisdiction country:');
  if (!country) return;
  try {
    const data = await apiJson(`/reports/jurisdiction/${encodeURIComponent(country)}`);
    downloadFile(`jurisdiction-${country.toLowerCase().replace(/\s+/g, '-')}.json`, JSON.stringify(data, null, 2), 'application/json');
  } catch (error) {
    showToast(`Jurisdiction report failed: ${error.message}`, true);
  }
}

async function downloadCustomReport() {
  const fields = window.prompt('Comma-separated fields (blank for default):', 'id,title,jurisdiction_country,stage,chili_score,updated_at') || '';
  const format = window.prompt('Format (json/csv):', 'json') || 'json';

  const params = new URLSearchParams();
  if (fields.trim()) params.set('fields', fields.trim());
  params.set('format', format.toLowerCase() === 'csv' ? 'csv' : 'json');

  const url = `${API_BASE}/reports/custom?${params.toString()}`;
  if (format.toLowerCase() === 'csv') {
    window.open(url, '_blank');
    return;
  }

  try {
    const data = await apiJson(`/reports/custom?${params.toString()}`);
    downloadFile('custom-report.json', JSON.stringify(data, null, 2), 'application/json');
  } catch (error) {
    showToast(`Custom report failed: ${error.message}`, true);
  }
}

function downloadFile(name, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toggleTheme() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  const button = document.getElementById('theme-toggle');
  button.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
  localStorage.setItem('opencode-theme', isDark ? 'dark' : 'light');
}

function restoreLocalState() {
  const savedTheme = localStorage.getItem('opencode-theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    document.getElementById('theme-toggle').textContent = '☀️ Light Mode';
  }

  const savedFilters = localStorage.getItem('opencode-filters');
  if (savedFilters) {
    try {
      currentFilters = {
        ...currentFilters,
        ...JSON.parse(savedFilters),
      };
    } catch {
      // ignore
    }
  }

  const savedPage = localStorage.getItem('opencode-active-page') || 'dashboard';
  showPage(savedPage);
}

function wireRiskSliders() {
  const min = document.getElementById('filter-min-risk');
  const max = document.getElementById('filter-max-risk');
  const label = document.getElementById('risk-range-label');
  const update = () => {
    const minVal = Number(min.value);
    const maxVal = Number(max.value);
    label.textContent = `${Math.min(minVal, maxVal)}-${Math.max(minVal, maxVal)}`;
  };
  min.addEventListener('input', update);
  max.addEventListener('input', update);
  update();
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeHtmlAttr(str) {
  return escapeHtml(str).replace(/\n/g, ' ');
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const dialog = document.getElementById('event-dialog');
    if (dialog.open) dialog.close();
  }

  if (event.key === '1') showPage('dashboard');
  if (event.key === '2') showPage('events');
  if (event.key === '3') showPage('competitors');
  if (event.key === '4') showPage('reports');

  if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    showPage('events');
    setTimeout(() => document.getElementById('filter-search').focus(), 50);
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  wireRiskSliders();
  await Promise.all([loadJurisdictionOptions(), loadSavedSearches()]);
  restoreLocalState();
  syncFiltersToUi();

  setInterval(loadDashboard, 60_000);
});
