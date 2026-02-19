const API_BASE = 'http://localhost:3001/api';

let currentPage = 1;
let currentJurisdiction = '';
let currentAgeBracket = '';
let currentMinRisk = '';
let lastUpdated = null;
let lastCrawled = null;

function showError(message) {
  const banner = document.getElementById('error-banner');
  const msg = document.getElementById('error-message');
  msg.textContent = message;
  banner.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-banner').classList.add('hidden');
}

function getChiliHTML(score) {
  const filled = '🌶️'.repeat(score);
  const empty = '○'.repeat(5 - score);
  return `<span class="chili">${filled}${empty}</span>`;
}

function getReliabilityHTML(tier) {
  if (!tier) return '';
  const stars = '★'.repeat(tier) + '☆'.repeat(5 - tier);
  return `<span class="reliability" title="Source reliability: ${tier}/5">${stars}</span>`;
}

function getAgeBracketLabel(bracket) {
  const labels = {
    '13-15': '13-15',
    '16-18': '16-18',
    'both': '13-18',
    'unknown': 'All'
  };
  return labels[bracket] || bracket || '';
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatJurisdiction(item) {
  if (item.jurisdiction.state) {
    return `${item.jurisdiction.state}, ${item.jurisdiction.country}`;
  }
  return item.jurisdiction.country;
}

function renderBriefItems(items) {
  const container = document.getElementById('brief-container');
  
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="empty-state">No priority items at this time.</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="brief-card">
      <div class="title">${escapeHTML(item.title)}</div>
      <div class="meta">
        <span class="jurisdiction">${escapeHTML(formatJurisdiction(item))}</span>
        ${item.ageBracket ? `<span class="age-bracket">Age: ${getAgeBracketLabel(item.ageBracket)}</span>` : ''}
        <span class="stage stage-${item.stage}">${item.stage.replace('_', ' ')}</span>
        <span class="chili">${getChiliHTML(item.chiliScore || item.scores?.chili || 1)}</span>
        ${item.reliabilityTier ? getReliabilityHTML(item.reliabilityTier) : ''}
      </div>
      <div class="reason">${escapeHTML(item.summary || 'No summary available')}</div>
      ${item.source?.url ? `<a href="${escapeHTML(item.source.url)}" target="_blank" rel="noopener" class="source-link">View Source →</a>` : ''}
      ${item.lastCrawledAt ? `<span class="crawled-at">Crawled: ${formatDate(item.lastCrawledAt)}</span>` : ''}
    </div>
  `).join('');
}

function renderEventsTable(data) {
  const container = document.getElementById('events-container');
  
  if (!data.items || data.items.length === 0) {
    container.innerHTML = '<div class="empty-state">No events match your filters.</div>';
    return;
  }

  const tableHTML = `
    <table class="events-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Jurisdiction</th>
          <th>Age</th>
          <th>Stage</th>
          <th>Risk</th>
          <th>Reliability</th>
          <th>Feedback</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td class="title-cell">
              <a href="#" onclick="showEventDetail('${item.id}'); return false;" title="${escapeHTML(item.summary || '')}">
                ${escapeHTML(item.title)}
              </a>
            </td>
            <td>${escapeHTML(formatJurisdiction(item))}</td>
            <td>${getAgeBracketLabel(item.ageBracket)}</td>
            <td><span class="stage stage-${item.stage}">${item.stage.replace('_', ' ')}</span></td>
            <td class="chili-cell">${getChiliHTML(item.scores?.chili || 1)}</td>
            <td>${item.reliabilityTier ? getReliabilityHTML(item.reliabilityTier) : ''}</td>
            <td class="feedback-cell">
              <button class="feedback-btn good" onclick="submitFeedback('${item.id}', 'good')" title="Mark as good">👍 Good</button>
              <button class="feedback-btn bad" onclick="submitFeedback('${item.id}', 'bad')" title="Mark as bad">👎 Bad</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = tableHTML;
}

function renderPagination(data) {
  const container = document.getElementById('pagination');
  
  if (data.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';
  
  if (data.page > 1) {
    html += `<button onclick="goToPage(${data.page - 1})">← Prev</button>`;
  }
  
  const maxPages = 5;
  let startPage = Math.max(1, data.page - Math.floor(maxPages / 2));
  let endPage = Math.min(data.totalPages, startPage + maxPages - 1);
  
  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${i === data.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (data.page < data.totalPages) {
    html += `<button onclick="goToPage(${data.page + 1})">Next →</button>`;
  }

  container.innerHTML = html;
}

function populateJurisdictionFilter(items) {
  const select = document.getElementById('jurisdiction-filter');
  const jurisdictions = new Set();
  
  items.forEach(item => {
    if (item.jurisdiction?.country) {
      jurisdictions.add(item.jurisdiction.country);
    }
    if (item.jurisdiction?.state) {
      jurisdictions.add(item.jurisdiction.state);
    }
  });

  const sorted = Array.from(jurisdictions).sort();
  
  const currentValue = select.value;
  select.innerHTML = '<option value="">All Jurisdictions</option>';
  sorted.forEach(j => {
    select.innerHTML += `<option value="${escapeHTML(j)}">${escapeHTML(j)}</option>`;
  });
  
  if (currentValue) {
    select.value = currentValue;
  }
}

async function fetchBrief() {
  try {
    const response = await fetch(`${API_BASE}/brief?limit=5`);
    if (!response.ok) {
      throw new Error(`Brief API error: ${response.status}`);
    }
    const data = await response.json();
    renderBriefItems(data.items);
    lastUpdated = data.generatedAt;
    document.getElementById('last-updated').textContent = formatDate(data.generatedAt);
  } catch (error) {
    console.error('Error fetching brief:', error);
    showError(`Failed to load brief: ${error.message}`);
    document.getElementById('brief-container').innerHTML = '<div class="error-state">Failed to load brief.</div>';
  }
}

async function fetchEvents(page = 1) {
  try {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('limit', '10');
    
    if (currentJurisdiction) {
      params.set('jurisdiction', currentJurisdiction);
    }
    if (currentAgeBracket) {
      params.set('ageBracket', currentAgeBracket);
    }
    if (currentMinRisk) {
      params.set('minRisk', currentMinRisk);
    }

    const response = await fetch(`${API_BASE}/events?${params}`);
    if (!response.ok) {
      throw new Error(`Events API error: ${response.status}`);
    }
    const data = await response.json();
    
    renderEventsTable(data);
    renderPagination(data);
    
    if (page === 1 && !currentJurisdiction && !currentMinRisk) {
      populateJurisdictionFilter(data.items);
    }
  } catch (error) {
    console.error('Error fetching events:', error);
    showError(`Failed to load events: ${error.message}`);
    document.getElementById('events-container').innerHTML = '<div class="error-state">Failed to load events.</div>';
  }
}

async function submitFeedback(eventId, rating) {
  try {
    const response = await fetch(`${API_BASE}/events/${eventId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating })
    });
    
    if (!response.ok) {
      throw new Error(`Feedback API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Feedback submitted:', result);
    
    showError('Feedback submitted successfully! (This banner will auto-dismiss)');
    setTimeout(hideError, 3000);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    showError(`Failed to submit feedback: ${error.message}`);
  }
}

function showEventDetail(eventId) {
  console.log('Show detail for event:', eventId);
}

async function triggerCrawl() {
  const btn = document.getElementById('crawl-btn');
  btn.disabled = true;
  btn.textContent = 'Crawling...';
  
  try {
    const response = await fetch(`${API_BASE}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`Crawl API error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Crawl result:', result);
    
    lastCrawled = new Date().toISOString();
    document.getElementById('last-crawled').textContent = formatDate(lastCrawled);
    
    showError(`Crawl complete! Items saved: ${result.itemsSaved}`);
    setTimeout(hideError, 5000);
    
    fetchBrief();
    fetchEvents();
  } catch (error) {
    console.error('Error triggering crawl:', error);
    showError(`Failed to run crawl: ${error.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Run Crawl';
  }
}

function goToPage(page) {
  currentPage = page;
  fetchEvents(page);
}

function applyFilters() {
  currentPage = 1;
  currentJurisdiction = document.getElementById('jurisdiction-filter').value;
  currentAgeBracket = document.getElementById('age-bracket-filter').value;
  currentMinRisk = document.getElementById('min-risk-filter').value;
  fetchEvents(currentPage);
}

function clearFilters() {
  currentPage = 1;
  currentJurisdiction = '';
  currentAgeBracket = '';
  currentMinRisk = '';
  document.getElementById('jurisdiction-filter').value = '';
  document.getElementById('age-bracket-filter').value = '';
  document.getElementById('min-risk-filter').value = '';
  fetchEvents(currentPage);
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchBrief();
  fetchEvents();
  
  setInterval(() => {
    fetchBrief();
    fetchEvents(currentPage);
  }, 60000);
});
