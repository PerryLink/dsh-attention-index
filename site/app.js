/** DSH Community Bench — static site runtime. No framework, no external calls. */

const state = {
  registry: null,
  badges: new Map(),
  surface: 'memory',
  query: '',
  tier: 'all',
}

const $ = (selector) => document.querySelector(selector)

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function pct(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function scoreText(row) {
  const scale = row.scoreScale ?? (row.tier === 'measured' ? 100 : 60)
  return `${Number(row.score).toFixed(1)}<small>/${scale}</small>`
}

function tierChip(tier) {
  return `<span class="chip ${tier === 'measured' ? 'measured' : 'prior'}">${tier === 'measured' ? '实测' : '先验'}</span>`
}

function bar(row) {
  const scale = row.scoreScale ?? (row.tier === 'measured' ? 100 : 60)
  const width = Math.max(0, Math.min(100, (Number(row.score) / scale) * 100))
  return `<div class="bar ${row.tier === 'measured' ? 'measured' : 'prior'}"><span style="width:${width.toFixed(1)}%"></span></div>`
}

function surfaceLabel(id) {
  const surface = state.registry?.surfaces?.find(item => item.id === id)
  return surface?.zh ?? surface?.label ?? id
}

function surfaceLabelEn(id) {
  const surface = state.registry?.surfaces?.find(item => item.id === id)
  return surface?.label ?? id
}

function badgeFor(pluginId) {
  const badge = state.badges.get(pluginId)
  if (badge === undefined) return '<span class="muted">—</span>'
  const src = `./${String(badge.svg).replace(/^badges\//, 'badges/')}`
  return `<a href="${escapeHtml(src)}" target="_blank" rel="noreferrer"><img class="badge-img" src="${escapeHtml(src)}" alt="DSH Bench badge" loading="lazy" /></a>`
}

function copyButton(pluginId) {
  const badge = state.badges.get(pluginId)
  if (badge === undefined) return ''
  return `<button class="copy" type="button" data-copy="${escapeHtml(pluginId)}">复制徽章</button>`
}

function renderHero() {
  const { registry } = state
  const measured = registry.stats.measuredPlugins
  const total = registry.stats.plugins
  $('#hero-status').textContent = measured === 0
    ? `${total} 个插件 · 0 个实测`
    : `${measured}/${total} 个插件有实测`
  $('#hero-sub').textContent = measured === 0
    ? '当前是 prior-only：分数只用于同一能力面内的先验排序，不代表任务效果；0–60 是压缩刻度。'
    : '实测行由成对 bench 决定；先验行单独标注。'
  $('#hero-card').classList.toggle('has-measured', measured > 0)
}

function renderStats() {
  const { registry } = state
  const items = [
    ['插件', registry.stats.plugins],
    ['能力面', registry.stats.surfaces],
    ['实测插件', registry.stats.measuredPlugins],
    ['贡献者', registry.stats.contributors],
    ['bench 结果', registry.stats.benchResults],
  ]
  $('#stats').innerHTML = items.map(([label, value]) => `
    <div class="stat">
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>`).join('')
}

function renderTabs() {
  const { registry } = state
  $('#surface-tabs').innerHTML = registry.surfaces.map(surface => {
    const active = surface.id === state.surface
    const measured = surface.measured > 0 ? `<span class="tab-count">${surface.measured}</span>` : ''
    return `<button class="tab" role="tab" aria-selected="${active}" data-surface="${escapeHtml(surface.id)}">${escapeHtml(surface.zh)}${measured}</button>`
  }).join('')
}

function currentRows() {
  const { registry } = state
  if (state.query.trim().length > 0) {
    const query = state.query.trim().toLowerCase()
    const byId = new Map()
    for (const surface of registry.surfaces) {
      for (const row of surface.leaderboard) {
        if (byId.has(row.pluginId)) continue
        const haystack = [row.name, row.author, row.summary, row.surface, surface.zh, surface.label].join(' ').toLowerCase()
        if (haystack.includes(query)) byId.set(row.pluginId, row)
      }
    }
    return [...byId.values()].sort((left, right) => {
      const tier = (right.tier === 'measured' ? 1 : 0) - (left.tier === 'measured' ? 1 : 0)
      if (tier !== 0) return tier
      return right.score - left.score
    })
  }
  const surface = registry.surfaces.find(item => item.id === state.surface)
  return surface?.leaderboard ?? []
}

function filteredRows(rows) {
  if (state.tier === 'all') return rows
  return rows.filter(row => row.tier === state.tier)
}

function renderCards(rows) {
  const top = rows.slice(0, 3)
  $('#surface-cards').innerHTML = top.map(row => `
    <article class="card">
      <div class="card-top">
        <span class="card-rank">#${row.rank}</span>
        ${tierChip(row.tier)}
      </div>
      <div class="card-name">${escapeHtml(row.name)}</div>
      <div class="card-author">${escapeHtml(row.author)} · ${escapeHtml(surfaceLabel(row.surface))}</div>
      <div class="card-score">${scoreText(row)}</div>
      ${bar(row)}
      <p class="card-summary">${escapeHtml(row.summary ?? '')}</p>
      <div class="card-foot">
        <span class="chip">先验 ${Number(row.prior).toFixed(1)}</span>
        <span class="chip">实测 ${row.bench === null ? '—' : Number(row.bench).toFixed(1)}</span>
        <span class="chip">覆盖 ${pct(row.coverage)}</span>
        <span class="chip">置信 ${pct(row.confidence)}</span>
        <a class="chip" href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">repo ↗</a>
      </div>
    </article>`).join('')
}

function renderTable(rows) {
  const body = $('#leaderboard-body')
  if (rows.length === 0) {
    body.innerHTML = ''
    $('#empty').hidden = false
    return
  }
  $('#empty').hidden = true
  body.innerHTML = rows.map(row => `
    <tr>
      <td class="num">${row.rank}</td>
      <td class="plugin-cell">
        <div class="plugin-name"><a href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">${escapeHtml(row.name)}</a></div>
        <div class="plugin-meta">${escapeHtml(row.author)} · ${escapeHtml(surfaceLabel(row.surface))} · ${escapeHtml(row.license ?? '')}</div>
      </td>
      <td class="num score-cell">
        <div class="score-line"><span class="score-value">${scoreText(row)}</span></div>
        ${bar(row)}
      </td>
      <td>${tierChip(row.tier)}</td>
      <td class="num">${Number(row.prior).toFixed(1)}</td>
      <td class="num">${row.bench === null ? '—' : Number(row.bench).toFixed(1)}</td>
      <td class="num">${pct(row.coverage)}</td>
      <td class="num">${pct(row.confidence)}</td>
      <td class="badge-cell">${badgeFor(row.pluginId)}${copyButton(row.pluginId)}</td>
    </tr>`).join('')
}

function renderSurfaceNote(rows) {
  const note = $('#surface-note')
  const measured = rows.filter(row => row.tier === 'measured').length
  if (state.query.trim().length > 0) {
    note.className = 'surface-note measured'
    note.textContent = `搜索“${state.query.trim()}”：${rows.length} 个结果。分数来自公共 registry，不同 surface 的分数不可直接横向比较。`
    return
  }
  const surface = state.registry.surfaces.find(item => item.id === state.surface)
  note.className = `surface-note ${surface?.measured > 0 ? 'measured' : ''}`
  note.textContent = surface?.note ?? ''
  if (measured === 0) {
    note.textContent += ' 先验分已压缩到 0–60；它不会压过任何有实测的插件。'
  }
}

function renderLeaderboard() {
  const rows = filteredRows(currentRows())
  renderTabs()
  renderSurfaceNote(rows)
  renderCards(rows)
  renderTable(rows)
  $('#generated').textContent = `registry ${state.registry.generatedAt} · scoring ${state.registry.scoring.version}`
}

function listBlock(title, rows, render) {
  return `<div class="attention-block">
    <h3>${escapeHtml(title)} <span class="muted">${rows.length}</span></h3>
    ${rows.length === 0 ? '<p class="muted">暂无；等待 bench/贡献数据。</p>' : `<ul>${rows.map(render).join('')}</ul>`}
  </div>`
}

function renderAttention() {
  const attention = state.registry.attention
  const featured = attention.featuredBySurface ?? []
  $('#attention-grid').innerHTML = [
    listBlock('Featured · 每个能力面第一', featured, row => `
      <li><span><a href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">${escapeHtml(row.name)}</a> <span class="muted">${escapeHtml(surfaceLabel(row.surface))}</span></span><strong>${Number(row.score).toFixed(1)}</strong></li>`),
    listBlock('New & promising · 新且低曝光', attention.newAndPromising ?? [], row => `
      <li><span><a href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">${escapeHtml(row.name)}</a> <span class="muted">${escapeHtml(row.author)}</span></span><strong>${Number(row.prior).toFixed(1)}</strong></li>`),
    listBlock('Most nominated · 待评测', attention.mostNominated ?? [], row => `
      <li><span><a href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">${escapeHtml(row.name)}</a> <span class="muted">${escapeHtml(surfaceLabel(row.surface))}</span></span><strong>${row.nominations} 提名</strong></li>`),
    listBlock('Most replicated · 独立复现', attention.mostReplicated ?? [], row => `
      <li><span><a href="${escapeHtml(row.repo)}" target="_blank" rel="noreferrer">${escapeHtml(row.name)}</a> <span class="muted">${escapeHtml(surfaceLabel(row.surface))}</span></span><strong>${row.runners} runners</strong></li>`),
  ].join('')
}

function renderContributors() {
  const contributors = state.registry.contributors
  if (contributors.length === 0) {
    $('#contributor-body').innerHTML = `
      <div class="attention-block">
        <p class="muted">还没有公开贡献记录。提交一条可复现轨迹（只发布哈希与指标，默认不发原文），就能获得 contributor credit、徽章和提名权。</p>
        <p><a href="#contribute">看贡献方式 →</a></p>
      </div>`
    return
  }
  $('#contributor-body').innerHTML = `<div class="contributor-grid">${contributors.map(row => `
    <div class="contributor">
      <div>
        <div class="contributor-name">${escapeHtml(row.contributor)} <span class="badge-${escapeHtml(row.badge)}">● ${escapeHtml(row.badge)}</span></div>
        <div class="contributor-meta">${row.count} 条 · 平均质量 ${Number(row.avgQuality).toFixed(1)} · ${row.surfaces.map(surfaceLabel).join(' / ')}</div>
      </div>
      <div class="contributor-credit">${row.credits}<small> credits</small></div>
    </div>`).join('')}</div>`
}

function renderFormula() {
  const scoring = state.registry.scoring
  const weights = scoring.weights.measured
  $('#formula').textContent = [
    scoring.formula,
    '',
    `measured weights: bench ${weights.bench} · prior ${weights.prior} · coverage ${weights.coverage} · community ${weights.community}`,
    `prior cap: ${scoring.priorCap} · min samples per arm: ${scoring.minSamples} · scoring ${scoring.version}`,
    '',
    scoring.note,
  ].join('\n')
}

function renderFooter() {
  $('#footer-generated').textContent = `generated ${state.registry.generatedAt} · ${state.registry.schema}`
}

function bind() {
  $('#surface-tabs').addEventListener('click', (event) => {
    const button = event.target.closest('[data-surface]')
    if (button === null) return
    state.surface = button.dataset.surface
    state.query = ''
    $('#search').value = ''
    renderLeaderboard()
  })
  $('#search').addEventListener('input', (event) => {
    state.query = event.target.value
    renderLeaderboard()
  })
  $('#tier-filter').addEventListener('change', (event) => {
    state.tier = event.target.value
    renderLeaderboard()
  })
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy]')
    if (button === null) return
    const badge = state.badges.get(button.dataset.copy)
    if (badge === undefined) return
    try {
      await navigator.clipboard.writeText(badge.markdown)
      const original = button.textContent
      button.textContent = '已复制'
      setTimeout(() => { button.textContent = original }, 1200)
    } catch {
      button.textContent = '复制失败'
    }
  })
}

async function load() {
  try {
    const [registryResponse, badgesResponse] = await Promise.all([
      fetch('./data/registry.json', { cache: 'no-store' }),
      fetch('./data/badges.json', { cache: 'no-store' }),
    ])
    if (!registryResponse.ok) throw new Error(`registry HTTP ${registryResponse.status}`)
    state.registry = await registryResponse.json()
    if (badgesResponse.ok) {
      const badgeData = await badgesResponse.json()
      for (const badge of badgeData.badges ?? []) state.badges.set(badge.pluginId, badge)
    }
    const firstMeasured = state.registry.surfaces.find(surface => surface.measured > 0)
    state.surface = firstMeasured?.id ?? state.registry.surfaces[0]?.id ?? 'memory'
    renderHero()
    renderStats()
    renderLeaderboard()
    renderAttention()
    renderContributors()
    renderFormula()
    renderFooter()
    bind()
  } catch (error) {
    $('#error').hidden = false
    $('#error').textContent = `无法加载 registry：${error instanceof Error ? error.message : String(error)}。请通过 HTTP 服务打开本页，而不是 file://。`
    $('#hero-status').textContent = 'Registry unavailable'
  }
}

load()
