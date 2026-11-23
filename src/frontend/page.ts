export const dashboardPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#10110f" />
    <meta name="description" content="Explore Melon’s Top 100, Hot 100 30-day and 100-day charts, and daily, weekly, and monthly music charts in one place." />
    <title>Charts Explorer — Melon Charts</title>
    <link rel="preconnect" href="https://cdnimg.melon.co.kr" crossorigin />
    <link rel="stylesheet" href="/app.css?v=4" />
  </head>
  <body>
    <div class="app-shell">
      <aside class="sidebar" aria-label="Chart navigation">
        <a class="brand" href="/" aria-label="Charts Explorer home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>melon<span class="brand-light">charts</span></span>
        </a>
        <div class="nav-label">EXPLORE</div>
        <nav class="chart-nav" aria-label="Jump to a chart">
          <a class="nav-item" href="#chart-top100"><span class="nav-index">01</span><span>Top 100</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
          <a class="nav-item" href="#chart-hot100"><span class="nav-index">02</span><span>Hot 100 · 30 days</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
          <a class="nav-item" href="#chart-hot100_100"><span class="nav-index">03</span><span>Hot 100 · 100 days</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
          <a class="nav-item" href="#chart-day"><span class="nav-index">04</span><span>Daily chart</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
          <a class="nav-item" href="#chart-week"><span class="nav-index">05</span><span>Weekly chart</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
          <a class="nav-item" href="#chart-month"><span class="nav-index">06</span><span>Monthly chart</span><span class="nav-arrow" aria-hidden="true">↗</span></a>
        </nav>
        <div class="sidebar-bottom">
          <span class="live-dot" aria-hidden="true"></span>
          <span>Connected to Melon</span>
          <span class="sidebar-version">API</span>
        </div>
      </aside>

      <main class="main-content">
        <header class="topbar">
          <div class="breadcrumb"><span>CHARTS</span><span class="breadcrumb-sep">/</span><strong>EXPLORER</strong></div>
          <a class="api-status" href="/health" target="_blank" rel="noreferrer"><span class="live-dot" aria-hidden="true"></span><span>API online</span></a>
        </header>

        <div class="page-wrap">
          <section class="intro" aria-labelledby="page-title">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span>THE SOUND OF RIGHT NOW</div>
              <h1 id="page-title">Charts <em>Explorer</em></h1>
              <p class="intro-copy">Every chart, one listening pulse. Search and compare what Korea is hearing.</p>
            </div>
            <div class="intro-note"><span class="note-spark" aria-hidden="true">✳</span><span>Six charts.<br />One listening pulse.</span></div>
          </section>

          <section class="explorer-controls" aria-label="Filter all charts">
            <label class="search-box" for="chart-search"><span aria-hidden="true">⌕</span><input id="chart-search" type="search" aria-label="Search all charts by song, artist, or album" placeholder="Search all charts…" autocomplete="off" /><kbd>⌘ K</kbd></label>
            <div class="toolbar-actions">
              <label class="select-wrap" for="sort-select"><span class="sr-only">Sort chart results</span><select id="sort-select"><option value="rank-asc">Rank: low to high</option><option value="rank-desc">Rank: high to low</option><option value="title-asc">Title: A to Z</option><option value="title-desc">Title: Z to A</option></select></label>
              <button class="filter-button" id="moving-filter" aria-pressed="false"><span aria-hidden="true">↗</span> Movers only</button>
            </div>
          </section>

          <div id="chart-state" class="state-message" role="status" aria-live="polite">Loading all charts…</div>
          <div id="chart-sections" class="chart-sections"></div>
          <footer class="page-footer"><span>Made for the love of music.</span><span>Rankings provided by Melon · <a href="/health" target="_blank" rel="noreferrer">API status</a></span></footer>
        </div>
      </main>
    </div>

    <dialog id="detail-dialog" class="detail-dialog" aria-labelledby="detail-title">
      <button class="dialog-close" id="dialog-close" aria-label="Close details">×</button>
      <div id="detail-content"></div>
    </dialog>
    <div class="dialog-backdrop" id="dialog-backdrop"></div>
    <script type="module" src="/app.js?v=3"></script>
  </body>
</html>`;
