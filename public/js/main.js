// ── Heat color scale (cool → warm) ──
function heatColor(weight, minW, maxW) {
  const t = (weight - minW) / (maxW - minW);
  const stops = [
    [0,    [100, 149, 237]],
    [0.25, [0,   171, 169]],
    [0.5,  [76,  175, 80]],
    [0.75, [218, 119, 86]],
    [1,    [211, 47,  47]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const f = (t - lo[0]) / (hi[0] - lo[0]);
  const r = Math.round(lo[1][0] + f * (hi[1][0] - lo[1][0]));
  const g = Math.round(lo[1][1] + f * (hi[1][1] - lo[1][1]));
  const b = Math.round(lo[1][2] + f * (hi[1][2] - lo[1][2]));
  return `rgb(${r},${g},${b})`;
}

async function loadJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

// ── Initialize ──
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const [keywords, trends, index] = await Promise.all([
      loadJSON('/data/keywords.json'),
      loadJSON('/data/trends.json'),
      loadJSON('/data/reports-index.json'),
    ]);

    document.getElementById('windowLabel').textContent =
      `数据窗口: ${keywords.window.from} ~ ${keywords.window.to}`;

    renderToday(index);
    renderCalendar(index);
    renderHeatmap(keywords);
    renderTrends(trends);
    initOverlay();
  } catch (e) {
    console.error(e);
    document.getElementById('windowLabel').textContent = '数据加载失败';
  }
});

// ── Today Card ──
function renderToday(data) {
  const sorted = [...data.reports].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  if (!latest) return;

  const d = new Date(latest.date + 'T00:00:00');
  document.getElementById('todayDay').textContent = d.getDate();
  document.getElementById('todayMonth').textContent = MONTHS[d.getMonth()];
  document.getElementById('todayWeekday').textContent = `周${WEEKDAYS[d.getDay()]}`;

  const tagsEl = document.getElementById('todayTags');
  const tags = latest.tags || [];
  tagsEl.innerHTML = tags.map(t => `<span class="today-tag">${t}</span>`).join('');

  const card = document.getElementById('todayCard');
  card.addEventListener('click', (e) => {
    e.preventDefault();
    openReport(`/reports/${latest.file}`);
  });
}

// ── Calendar ──
function renderCalendar(data) {
  const btn = document.getElementById('calendarToggle');
  const wrap = document.getElementById('calendarWrap');
  const cal = document.getElementById('calendar');

  btn.addEventListener('click', () => {
    const isOpen = wrap.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    btn.querySelector('svg').style.transform = isOpen ? 'rotate(180deg)' : '';
    const textNode = btn.childNodes[btn.childNodes.length - 1];
    textNode.textContent = isOpen ? ' 收起日历' : ' 展开日历';
  });

  // Build report map
  const reportMap = new Map();
  data.reports.forEach(r => reportMap.set(r.date, r));

  // Determine month to show (latest report's month)
  const sorted = [...data.reports].sort((a, b) => b.date.localeCompare(a.date));
  const refDate = sorted[0] ? new Date(sorted[0].date + 'T00:00:00') : new Date();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Header row
  const headers = ['一', '二', '三', '四', '五', '六', '日'];
  headers.forEach(h => {
    const el = document.createElement('div');
    el.className = 'cal-header';
    el.textContent = h;
    cal.appendChild(el);
  });

  // First day of month
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay();
  if (startDow === 0) startDow = 7; // Monday = 1
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before first day
  for (let i = 1; i < startDow; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    cal.appendChild(el);
  }

  // Day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const report = reportMap.get(dateStr);
    const el = document.createElement('div');
    el.className = 'cal-day';

    if (dateStr === todayStr) el.classList.add('today');
    if (report) el.classList.add('has-report');

    // Day number
    const numEl = document.createElement('div');
    numEl.className = 'cal-num';
    numEl.textContent = day;
    el.appendChild(numEl);

    // Tags (up to 3)
    if (report && report.tags) {
      const tagsEl = document.createElement('div');
      tagsEl.className = 'cal-tags';
      report.tags.slice(0, 3).forEach(tag => {
        const tagEl = document.createElement('div');
        tagEl.className = 'cal-tag';
        tagEl.textContent = tag;
        tagsEl.appendChild(tagEl);
      });
      el.appendChild(tagsEl);
    }

    // Click to open report
    if (report) {
      el.addEventListener('click', () => openReport(`/reports/${report.file}`));
    }

    cal.appendChild(el);
  }
}

// ── Report Overlay (paper pop-out animation) ──
function initOverlay() {
  const overlay = document.getElementById('reportOverlay');
  const closeBtn = document.getElementById('reportClose');
  const iframe = document.getElementById('reportIframe');

  closeBtn.addEventListener('click', () => closeReport());

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeReport();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeReport();
  });
}

function openReport(url) {
  const overlay = document.getElementById('reportOverlay');
  const iframe = document.getElementById('reportIframe');
  iframe.src = url;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeReport() {
  const overlay = document.getElementById('reportOverlay');
  const iframe = document.getElementById('reportIframe');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  setTimeout(() => { iframe.src = 'about:blank'; }, 400);
}

// ── Keyword Heatmap (text-only, heat-colored) ──
function renderHeatmap(data) {
  const container = document.getElementById('heatmap');
  const width = container.clientWidth;
  const height = container.clientHeight;

  const top10 = [...data.keywords].sort((a, b) => b.weight - a.weight).slice(0, 10);
  const top10Set = new Set(top10.map(k => k.word));
  const weights = top10.map(k => k.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);

  const fontScale = d3.scaleSqrt().domain([minW, maxW]).range([18, 42]);

  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  const g = svg.append('g');

  const nodes = top10.map(k => ({
    id: k.word, weight: k.weight,
    fontSize: fontScale(k.weight),
    color: heatColor(k.weight, minW, maxW),
  }));

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const links = data.links
    .filter(l => top10Set.has(l.source) && top10Set.has(l.target))
    .map(l => ({ source: l.source, target: l.target, strength: l.strength }));

  // Measure text
  const tempSvg = d3.select('body').append('svg').style('position', 'absolute').style('visibility', 'hidden');
  nodes.forEach(n => {
    const text = tempSvg.append('text')
      .attr('font-size', n.fontSize).attr('font-weight', 700)
      .attr('font-family', "'Inter', 'Noto Sans SC', sans-serif").text(n.id);
    const bbox = text.node().getBBox();
    n.textWidth = bbox.width + 20;
    n.textHeight = bbox.height + 8;
  });
  tempSvg.remove();

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(130).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(d => Math.max(d.textWidth, d.textHeight) / 2 + 8))
    .force('x', d3.forceX(width / 2).strength(0.12))
    .force('y', d3.forceY(height / 2).strength(0.12));

  const link = g.append('g').selectAll('line').data(links).join('line')
    .attr('stroke', '#D4D0CC')
    .attr('stroke-width', d => 1 + d.strength * 2)
    .attr('stroke-opacity', d => 0.25 + d.strength * 0.25)
    .attr('stroke-dasharray', d => d.strength > 0.7 ? 'none' : '4 3');

  const node = g.append('g').selectAll('g').data(nodes).join('g')
    .style('cursor', 'grab')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    );

  node.append('text')
    .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
    .attr('font-size', d => d.fontSize).attr('font-weight', 700)
    .attr('font-family', "'Inter', 'Noto Sans SC', sans-serif")
    .attr('fill', d => d.color).attr('opacity', 0.9).text(d => d.id);

  const tooltip = document.getElementById('tooltip');
  node.on('mouseover', (e, d) => {
    link.attr('stroke-opacity', l =>
      (l.source.id === d.id || l.target.id === d.id) ? 0.8 : 0.1
    ).attr('stroke', l =>
      (l.source.id === d.id || l.target.id === d.id) ? d.color : '#D4D0CC'
    );
    node.select('text').attr('opacity', n => (n.id === d.id) ? 1 : 0.3);
    tooltip.innerHTML = `<strong>${d.id}</strong><br>热度: ${d.weight}`;
    tooltip.classList.add('visible');
  })
  .on('mousemove', (e) => {
    tooltip.style.left = e.clientX + 14 + 'px';
    tooltip.style.top = e.clientY - 14 + 'px';
  })
  .on('mouseout', () => {
    link.attr('stroke-opacity', l => 0.25 + l.strength * 0.25).attr('stroke', '#D4D0CC');
    node.select('text').attr('opacity', 0.9);
    tooltip.classList.remove('visible');
  });

  simulation.on('tick', () => {
    nodes.forEach(d => {
      const px = d.textWidth / 2 + 16;
      const py = d.textHeight / 2 + 16;
      d.x = Math.max(px, Math.min(width - px, d.x));
      d.y = Math.max(py, Math.min(height - py, d.y));
    });
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  simulation.alpha(1).restart();
}

// ── Trends Chart ──
function renderTrends(data) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  const top5 = data.trends.slice(0, 5);
  const palette = ['#D32F2F', '#DA7756', '#2D7A3F', '#3B6CB5', '#7B3FAF'];

  const datasets = top5.map((t, i) => ({
    label: t.keyword, data: t.values,
    borderColor: palette[i], backgroundColor: palette[i] + '18',
    borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6, tension: 0.35, fill: false,
  }));

  const labels = data.dates.map(d => {
    const date = new Date(d + 'T00:00:00');
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 20,
            font: { size: 12, family: "'Inter', 'Noto Sans SC', sans-serif", weight: '500' } },
        },
        tooltip: { backgroundColor: '#1A1714', titleFont: { size: 12 }, bodyFont: { size: 11 }, padding: 10, cornerRadius: 6 },
      },
      scales: {
        x: { grid: { color: '#F0EDEA' }, ticks: { font: { size: 11 }, color: '#9B9590' } },
        y: { beginAtZero: true, max: 100, grid: { color: '#F0EDEA' },
          ticks: { font: { size: 11 }, color: '#9B9590' },
          title: { display: true, text: '相对热度', font: { size: 12 }, color: '#9B9590' } },
      },
    },
  });
}
