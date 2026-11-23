export const dashboardPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#10110f" />
    <meta name="description" content="Explore the latest Melon music chart rankings." />
    <title>Melon Charts — Music, ranked</title>
    <link rel="preconnect" href="https://cdnimg.melon.co.kr" crossorigin />
    <link rel="stylesheet" href="/app.css?v=3" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Chart navigation">
        <a class="brand" href="/" aria-label="Melon Charts home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>melon<span class="brand-light">charts</span></span>
        </a>
        <div class="nav-label">EXPLORE</div>
        <nav class="chart-nav" aria-label="Charts">
          <button class="nav-item active" data-chart="top100"><span class="nav-index">01</span><span>Top 100</span><span class="nav-arrow" aria-hidden="true">↗</span></button>
          <button class="nav-item" data-chart="hot100"><span class="nav-index">02</span><span>Hot 100</span><span class="nav-arrow" aria-hidden="true">↗</span></button>
          <button class="nav-item" data-chart="day"><span class="nav-index">03</span><span>Daily chart</span><span class="nav-arrow" aria-hidden="true">↗</span></button>
          <button class="nav-item" data-chart="week"><span class="nav-index">04</span><span>Weekly chart</span><span class="nav-arrow" aria-hidden="true">↗</span></button>
          <button class="nav-item" data-chart="month"><span class="nav-index">05</span><span>Monthly chart</span><span class="nav-arrow" aria-hidden="true">↗</span></button>
        </nav>
        <div class="sidebar-bottom">
          <span class="live-dot" aria-hidden="true"></span>
          <span>Connected to Melon</span>
          <span class="sidebar-version">API</span>
        </div>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div class="breadcrumb"><span>CHARTS</span><span class="breadcrumb-sep">/</span><strong id="breadcrumb-chart">TOP 100</strong></div>
          <a class="api-status" href="/health" target="_blank" rel="noreferrer"><span class="live-dot" aria-hidden="true"></span><span>API online</span></a>
        </header>

        <div class="page-wrap">
          <section class="intro" aria-labelledby="page-title">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span>THE SOUND OF RIGHT NOW</div>
              <h1 id="page-title">Music, <em>ranked.</em></h1>
              <p class="intro-copy">A closer look at what Korea is listening to.</p>
            </div>
            <div class="intro-note"><span class="note-spark">✳</span><span>Five charts.<br />One listening pulse.</span></div>
          </section>

          <section class="chart-heading" aria-label="Selected chart">
            <div>
              <div class="chart-kicker"><span class="live-dot" aria-hidden="true"></span>LIVE FROM MELON</div>
              <h2 id="chart-title">Top 100</h2>
              <p id="chart-description">The songs shaping the moment.</p>
              <p id="chart-official-time" class="chart-updated" aria-live="polite">Reading Melon chart time…</p>
            </div>
            <div class="chart-meta"><span id="chart-total">—</span><span>TRACKS</span></div>
          </section>
          <div id="hot100-period" class="hot100-period" role="group" aria-label="Hot 100 time period" hidden>
            <button type="button" class="period-button active" data-period="30" aria-pressed="true">30 days</button>
            <button type="button" class="period-button" data-period="100" aria-pressed="false">100 days</button>
          </div>

          <section class="stats-grid" aria-label="Chart summary">
            <article class="stat-card"><div class="stat-label">TRACKS LISTED</div><div class="stat-value" id="stat-tracks">—</div><div class="stat-foot">In this chart</div><span class="stat-glyph" aria-hidden="true">#</span></article>
            <article class="stat-card"><div class="stat-label">RISING NOW</div><div class="stat-value" id="stat-rising">—</div><div class="stat-foot">Songs moving up</div><span class="stat-glyph rise" aria-hidden="true">↗</span></article>
            <article class="stat-card"><div class="stat-label">DETAILS AVAILABLE</div><div class="stat-value" id="stat-details">—</div><div class="stat-foot">Songs with Melon IDs</div><span class="stat-glyph detail" aria-hidden="true">◎</span></article>
          </section>

          <section class="ranking-section" aria-labelledby="ranking-title">
            <div class="section-heading">
              <div><div class="section-overline">THE COUNTDOWN</div><h2 id="ranking-title">Current rankings</h2></div>
              <div class="result-count" id="result-count">Loading chart…</div>
            </div>
            <div class="toolbar">
              <label class="search-box" for="chart-search"><span aria-hidden="true">⌕</span><input id="chart-search" type="search" aria-label="Search songs, artists, albums" placeholder="Search songs, artists, albums" autocomplete="off" /><kbd>⌘ K</kbd></label>
              <div class="toolbar-actions">
                <label class="select-wrap" for="sort-select"><span class="sr-only">Sort rankings</span><select id="sort-select"><option value="rank-asc">Rank: low to high</option><option value="rank-desc">Rank: high to low</option><option value="title-asc">Title: A to Z</option><option value="title-desc">Title: Z to A</option></select></label>
                <button class="filter-button" id="moving-filter" aria-pressed="false"><span aria-hidden="true">↗</span> Movers only</button>
              </div>
            </div>
            <div id="chart-state" class="state-message" role="status" aria-live="polite">Loading chart data…</div>
            <div class="table-wrap" id="table-wrap" hidden>
              <table class="rank-table">
                <thead><tr><th scope="col" class="rank-column">#</th><th scope="col">TRACK</th><th scope="col" class="album-column">ALBUM</th><th scope="col" class="movement-column">MOVEMENT</th><th scope="col" class="action-column"><span class="sr-only">Details</span></th></tr></thead>
                <tbody id="chart-rows"></tbody>
              </table>
              <div id="empty-state" class="empty-state" hidden><span class="empty-mark" aria-hidden="true">⌕</span><strong>No tracks found</strong><span>Try another search or clear your filters.</span><button id="clear-filters" class="text-button">Clear filters</button></div>
            </div>
            <div class="table-footer"><span>Rankings provided by Melon</span><span id="footer-chart">TOP 100 · LIVE CHART</span></div>
          </section>
          <footer class="page-footer"><span>Made for the love of music.</span><span>Data from Melon · <a href="/health" target="_blank" rel="noreferrer">API status</a></span></footer>
        </div>
      </main>
    </div>

    <dialog id="detail-dialog" class="detail-dialog" aria-labelledby="detail-title">
      <button class="dialog-close" id="dialog-close" aria-label="Close details">×</button>
      <div id="detail-content"></div>
    </dialog>
    <div class="dialog-backdrop" id="dialog-backdrop"></div>
    <script type="module" src="/app.js?v=2"></script>
  </body>
</html>`;
