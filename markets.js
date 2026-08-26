// assets/markets.js
// Fiscal Frontier — Global Markets frontend module.
// Talks only to /api/markets and /api/history (this site's own backend) — never to a
// data provider directly, so no API key ever reaches the browser (spec item 39).

(function () {
  const POLL_INTERVAL_MS = 45_000; // sensible refresh interval — see spec item 32 ("avoid excessive API requests")
  const API_BASE = ''; // same-origin; point this at your deployed backend if hosted separately

  const REGION_ORDER = ['India', 'United States', 'Europe', 'Asia-Pacific'];

  let latestData = null;
  let pollTimer = null;

  function fmtPrice(value, currency) {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  function fmtChange(change, changePct) {
    if (change === null || change === undefined) return { text: '—', dir: 'flat' };
    const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
    const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '•';
    const sign = change > 0 ? '+' : '';
    const pct = changePct === null || changePct === undefined ? '' : ` (${sign}${changePct.toFixed(2)}%)`;
    return { text: `${arrow} ${sign}${change.toFixed(2)}${pct}`, dir };
  }

  function fmtTimestamp(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    return (
      d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      ' IST'
    );
  }

  function statusLabel(status) {
    switch (status) {
      case 'open': return { text: 'Open', dot: '🟢' };
      case 'closed': return { text: 'Closed', dot: '⚪' };
      case 'pre-market': return { text: 'Pre-market', dot: '🟡' };
      case 'after-hours': return { text: 'After-hours', dot: '🟠' };
      default: return { text: 'Status unavailable', dot: '⚪' };
    }
  }

  function dataStatusBadge(item) {
    if (item.data_status === 'unavailable') return '<span class="mkt-badge mkt-badge--warn">Unavailable</span>';
    if (item.data_status === 'delayed') return `<span class="mkt-badge">${item.delayed_minutes} min delayed</span>`;
    return '<span class="mkt-badge mkt-badge--live">Live</span>';
  }

  async function fetchMarkets() {
    try {
      const res = await fetch(`${API_BASE}/api/markets`);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      latestData = data;
      renderTicker(data);
      renderGlobalMarkets(data);
    } catch (err) {
      renderFetchError();
    }
  }

  function renderFetchError() {
    const ticker = document.getElementById('market-ticker-track');
    const section = document.getElementById('global-markets-body');
    const notice = '<span class="mkt-unavailable">Market data temporarily unavailable</span>';
    if (ticker && !latestData) ticker.innerHTML = notice;
    if (section && !latestData) section.innerHTML = `<p class="mkt-unavailable">${notice} — retrying automatically.</p>`;
  }

  function renderTicker(data) {
    const track = document.getElementById('market-ticker-track');
    if (!track) return;
    const items = data.indices.filter((i) => i.show_on_ticker !== false);
    track.innerHTML = items
      .map((item) => {
        const chg = fmtChange(item.change, item.change_percent);
        return `<span class="mkt-ticker-item mkt-${chg.dir}"><a href="#/markets/${item.id}">${item.name}</a> ${fmtPrice(
          item.price
        )} ${chg.text}</span>`;
      })
      .join('');
  }

  function renderGlobalMarkets(data) {
    const container = document.getElementById('global-markets-body');
    if (!container) return;

    const byRegion = {};
    data.indices.forEach((item) => {
      byRegion[item.region] = byRegion[item.region] || [];
      byRegion[item.region].push(item);
    });

    const regions = Object.keys(byRegion).sort(
      (a, b) => REGION_ORDER.indexOf(a) - REGION_ORDER.indexOf(b)
    );

    container.innerHTML = regions
      .map((region) => {
        const rows = byRegion[region]
          .map((item) => {
            const chg = fmtChange(item.change, item.change_percent);
            const st = statusLabel(item.market_status);
            if (item.data_status === 'unavailable') {
              return `<article class="mkt-card mkt-card--unavailable" data-id="${item.id}">
                <div class="mkt-card-top"><strong>${item.flag} ${item.name}</strong>${dataStatusBadge(item)}</div>
                <p class="mkt-unavailable">Market data temporarily unavailable</p>
              </article>`;
            }
            return `<article class="mkt-card mkt-${chg.dir}" data-id="${item.id}">
              <div class="mkt-card-top"><strong>${item.flag} ${item.name}</strong>${dataStatusBadge(item)}</div>
              <div class="mkt-card-price">${fmtPrice(item.price)}</div>
              <div class="mkt-card-change">${chg.text}</div>
              <div class="mkt-card-foot"><span>${st.dot} ${st.text}</span><span>Updated: ${fmtTimestamp(item.last_updated) || '—'}</span></div>
            </article>`;
          })
          .join('');
        return `<div class="mkt-region"><h3>${region}</h3><div class="mkt-grid">${rows}</div></div>`;
      })
      .join('');

    container.querySelectorAll('.mkt-card[data-id]').forEach((card) => {
      card.addEventListener('click', () => {
        window.location.hash = `#/markets/${card.dataset.id}`;
      });
    });
  }

  // --- Detail view -----------------------------------------------------
  async function openDetail(id) {
    const modal = document.getElementById('market-detail-modal');
    const body = document.getElementById('market-detail-body');
    if (!modal || !body) return;
    const item = latestData && latestData.indices.find((i) => i.id === id);
    if (!item) return;

    modal.classList.add('open');
    body.innerHTML = renderDetailShell(item);
    attachRangeHandlers(id);
    loadChart(id, '1M');
  }

  function renderDetailShell(item) {
    const chg = fmtChange(item.change, item.change_percent);
    const st = statusLabel(item.market_status);
    return `
      <h2>${item.flag} ${item.name}</h2>
      <div class="mkt-detail-price">${fmtPrice(item.price)} <span class="mkt-${chg.dir}">${chg.text}</span></div>
      <div class="mkt-detail-meta">
        <span>${st.dot} ${st.text}</span>
        <span>${dataStatusBadge(item)}</span>
        <span>Updated: ${fmtTimestamp(item.last_updated) || '—'}</span>
      </div>
      <table class="mkt-detail-table">
        <tr><td>Open</td><td>${fmtPrice(item.open)}</td></tr>
        <tr><td>Previous close</td><td>${fmtPrice(item.previous_close)}</td></tr>
        <tr><td>Day high</td><td>${fmtPrice(item.day_high)}</td></tr>
        <tr><td>Day low</td><td>${fmtPrice(item.day_low)}</td></tr>
        <tr><td>52-week high</td><td>${fmtPrice(item.fifty_two_week_high)}</td></tr>
        <tr><td>52-week low</td><td>${fmtPrice(item.fifty_two_week_low)}</td></tr>
      </table>
      <div class="mkt-range-row">
        ${['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'].map((r) => `<button class="mkt-range-btn${r === '1M' ? ' active' : ''}" data-range="${r}">${r}</button>`).join('')}
      </div>
      <div class="mkt-chart-wrap"><canvas id="mkt-chart"></canvas></div>
      <p class="mkt-disclaimer">Market data may be real-time or delayed depending on the exchange and data provider. Information is provided for informational and research purposes only and should not be considered investment advice.</p>
    `;
  }

  function attachRangeHandlers(id) {
    document.querySelectorAll('.mkt-range-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mkt-range-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadChart(id, btn.dataset.range);
      });
    });
  }

  let chartInstance = null;
  async function loadChart(id, range) {
    const canvas = document.getElementById('mkt-chart');
    if (!canvas) return;
    try {
      const res = await fetch(`${API_BASE}/api/history?id=${id}&range=${range}`);
      if (!res.ok) throw new Error('history unavailable');
      const data = await res.json();
      if (!window.Chart) await loadChartLibrary();
      if (chartInstance) chartInstance.destroy();
      chartInstance = new window.Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: data.points.map((p) => p.t),
          datasets: [{ data: data.points.map((p) => p.c), borderColor: '#355b32', borderWidth: 2, pointRadius: 0, tension: 0.15 }],
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { display: false }, y: { display: true } },
        },
      });
    } catch (err) {
      canvas.parentElement.innerHTML = '<p class="mkt-unavailable">Historical chart unavailable for this range.</p>';
    }
  }

  function loadChartLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function handleHashRoute() {
    const match = window.location.hash.match(/^#\/markets\/(.+)$/);
    const modal = document.getElementById('market-detail-modal');
    if (match) {
      openDetail(match[1]);
    } else if (modal) {
      modal.classList.remove('open');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('market-detail-close');
    if (closeBtn) closeBtn.addEventListener('click', () => (window.location.hash = ''));
    window.addEventListener('hashchange', handleHashRoute);

    fetchMarkets();
    handleHashRoute();
    pollTimer = setInterval(fetchMarkets, POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', () => {
      // pause polling in background tabs to avoid unnecessary requests
      if (document.hidden) {
        clearInterval(pollTimer);
      } else {
        fetchMarkets();
        pollTimer = setInterval(fetchMarkets, POLL_INTERVAL_MS);
      }
    });
  });
})();
