export const historyPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#10110f" />
    <meta name="description" content="Browse saved Melon chart snapshots and track rank changes over time." />
    <title>Chart History — Melon Charts</title>
    <link rel="preconnect" href="https://cdnimg.melon.co.kr" crossorigin />
    <link rel="stylesheet" href="/app.css?v=5" />
    <link rel="stylesheet" href="/history.css?v=1" />
  </head>
  <body>
    <div class="app-shell">
      <main class="main-content">
        <header class="topbar">
          <a class="brand topbar-brand" href="/" aria-label="Melon Charts home">
            <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
            <span>melon<span class="brand-light">charts</span></span>
          </a>
          <nav class="top-navigation" aria-label="Main navigation">
            <a class="top-nav-item" href="/">Chart Explorer</a>
            <a class="top-nav-item" href="/history" aria-current="page">History</a>
            <a class="top-nav-item" href="/live-filter">Live Filter</a>
          </nav>
          <a class="api-status" href="/health" target="_blank" rel="noreferrer"><span class="live-dot" aria-hidden="true"></span><span>API online</span></a>
        </header>

        <div class="page-wrap history-page">
          <section class="intro history-intro" aria-labelledby="page-title">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span>SCRAPER-SAVED SNAPSHOTS</div>
              <h1 id="page-title">Chart <em>History</em></h1>
              <p class="intro-copy">Explore only the chart positions saved by Live Filter. No reconstructed or browser-fetched history.</p>
            </div>
            <div class="history-market" aria-label="Available market: South Korea, Melon">
              <span class="history-market-label">MARKET</span>
              <strong>South Korea · Melon</strong>
              <span>Only market currently stored</span>
            </div>
          </section>

          <section class="history-filters" aria-label="Filter saved chart history">
            <label class="history-search" for="history-search"><span aria-hidden="true">⌕</span><input id="history-search" type="search" maxlength="80" placeholder="Filter by artist or track…" autocomplete="off" /><span class="search-hint">FILTER</span></label>
            <label class="history-filter-field" for="chart-filter"><span>CHART</span><select id="chart-filter"><option value="all">All charts</option><option value="top100">Top 100</option><option value="hot100_30">Hot 100 · 30d</option><option value="hot100_100">Hot 100 · 100d</option><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></select></label>
            <label class="history-filter-field" for="date-from"><span>FROM</span><input id="date-from" type="date" /></label>
            <label class="history-filter-field" for="date-to"><span>TO</span><input id="date-to" type="date" /></label>
            <label class="history-filter-field history-sort-field" for="history-sort"><span>SORT</span><select id="history-sort"><option value="date_desc">Newest first</option><option value="date_asc">Oldest first</option><option value="rank_asc">Best rank</option><option value="rank_desc">Lowest rank</option></select></label>
          </section>

          <section id="track-detail" class="track-detail" aria-live="polite" hidden>
            <div class="track-detail-heading">
              <div><div class="section-overline">TRACK HISTORY</div><h2 id="track-detail-title">Track timeline</h2><p id="track-detail-subtitle">Rank observations from saved snapshots.</p></div>
              <button class="history-close" id="close-track-detail" type="button">Close detail</button>
            </div>
            <div id="track-chart" class="track-chart"></div>
          </section>

          <section class="history-summary" aria-label="History summary">
            <article class="history-stat"><span class="stat-label">SAVED OBSERVATIONS</span><strong id="history-total">—</strong><span class="stat-foot">matching the current filters</span></article>
            <article class="history-stat"><span class="stat-label">TRACKS FOUND</span><strong id="history-tracks">—</strong><span class="stat-foot">with chart positions in range</span></article>
            <article class="history-stat"><span class="stat-label">SNAPSHOT WINDOW</span><strong id="history-window">—</strong><span class="stat-foot">first to latest match</span></article>
          </section>

          <section class="history-board" aria-labelledby="history-heading">
            <div class="history-board-heading">
              <div><div class="section-overline">DATABASE SNAPSHOTS</div><h2 id="history-heading">Chart positions over time</h2><p>Change compares each saved position with the most recent earlier saved position for that same track and chart.</p></div>
              <label class="history-page-size" for="page-size"><span>ROWS</span><select id="page-size"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label>
            </div>
            <div id="history-state" class="history-state" role="status" aria-live="polite">Loading saved chart history…</div>
            <div id="history-table-wrap" class="history-table-wrap" role="region" aria-label="Saved Melon chart history" tabindex="0" hidden>
              <table class="history-table">
                <thead><tr><th scope="col">SNAPSHOT</th><th scope="col">CHART</th><th scope="col">RANK</th><th scope="col">CHANGE</th><th scope="col">MELON MOVE</th><th scope="col">PEAK</th><th scope="col">TRACK / ARTIST</th><th scope="col"><span class="sr-only">Track action</span></th></tr></thead>
                <tbody id="history-rows"></tbody>
              </table>
            </div>
            <div class="history-empty" id="history-empty" hidden><span class="empty-mark" aria-hidden="true">⌕</span><strong>No saved chart snapshots in this range</strong><span>Try a wider date range or another chart filter. This page only shows data already stored by the scraper.</span></div>
            <nav class="history-pagination" id="history-pagination" aria-label="History pages" hidden>
              <span id="page-status">Page 1 of 1</span>
              <div><button id="previous-page" type="button" aria-label="Previous page">← Previous</button><button id="next-page" type="button" aria-label="Next page">Next →</button></div>
            </nav>
          </section>
          <footer class="page-footer"><span>Made for the love of music.</span><span>Historical data from saved scraper snapshots · <a href="/live-filter">Live Filter</a></span></footer>
        </div>
      </main>
    </div>
    <script type="module" src="/history.js?v=1"></script>
  </body>
</html>`;
