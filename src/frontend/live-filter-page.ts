export const liveFilterPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#10110f" />
    <meta name="description" content="Track the live chart positions of songs in your selected Melon playlist." />
    <title>Live Filter — Melon Charts</title>
    <link rel="preconnect" href="https://cdnimg.melon.co.kr" crossorigin />
    <link rel="stylesheet" href="/app.css?v=5" />
    <link rel="stylesheet" href="/live-filter.css?v=1" />
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
            <a class="top-nav-item" href="/live-filter" aria-current="page">Live Filter</a>
          </nav>
          <a class="api-status" href="/health" target="_blank" rel="noreferrer"><span class="live-dot" aria-hidden="true"></span><span>API online</span></a>
        </header>

        <div class="page-wrap live-filter-page">
          <section class="intro live-filter-intro" aria-labelledby="page-title">
            <div>
              <div class="eyebrow"><span class="eyebrow-line"></span>PLAYLIST-DRIVEN CHART TRACKING</div>
              <h1 id="page-title">Live <em>Filter</em></h1>
              <p class="intro-copy">Your playlist, mapped across every Melon chart. New playlist additions are picked up automatically.</p>
            </div>
            <a class="playlist-source" href="https://kko.to/3pJvNBdFA2" target="_blank" rel="noreferrer">
              <span class="source-icon" aria-hidden="true">↗</span>
              <span><span class="source-label">TRACKING PLAYLIST</span><strong>Open in Melon</strong></span>
            </a>
          </section>

          <section class="live-stats" aria-label="Playlist chart summary">
            <article class="live-stat-card"><span class="stat-label">PLAYLIST TRACKS</span><strong class="live-stat-value" id="track-count">—</strong><span class="stat-foot">from your Melon playlist</span></article>
            <article class="live-stat-card"><span class="stat-label">CHARTING NOW</span><strong class="live-stat-value" id="charting-count">—</strong><span class="stat-foot">songs on at least one chart</span></article>
            <article class="live-stat-card"><span class="stat-label">CHARTS CHECKED</span><strong class="live-stat-value">06</strong><span class="stat-foot">Top 100, Hot 100, daily, weekly, monthly</span></article>
          </section>

          <section class="live-board" aria-labelledby="positions-title">
            <div class="live-board-heading">
              <div><div class="section-overline">YOUR PLAYLIST</div><h2 id="positions-title">Current chart positions</h2><p>Tracks stay here even when they are not charting.</p></div>
              <div class="live-board-actions"><span class="last-synced" id="last-synced" role="status">Waiting for chart data…</span><button class="refresh-button" id="refresh-live" type="button">Refresh</button></div>
            </div>
            <label class="live-search" for="live-search"><span aria-hidden="true">⌕</span><input id="live-search" type="search" placeholder="Find a song or artist…" autocomplete="off" /><span class="search-hint">FILTER</span></label>
            <div id="live-state" class="live-state" role="status" aria-live="polite">Loading your playlist and chart positions…</div>
            <div class="live-table-wrap" id="live-table-wrap" role="region" aria-label="Melon playlist song chart positions" tabindex="0">
              <table class="live-table">
                <thead><tr><th scope="col" class="live-track-heading">TRACK</th><th scope="col">TOP 100</th><th scope="col">HOT 30D</th><th scope="col">HOT 100D</th><th scope="col">DAILY</th><th scope="col">WEEKLY</th><th scope="col">MONTHLY</th></tr></thead>
                <tbody id="live-rows"></tbody>
              </table>
              <div class="live-empty" id="live-empty" hidden><span class="empty-mark" aria-hidden="true">⌕</span><strong>No tracks found</strong><span>Try a different search.</span></div>
            </div>
            <div class="live-footnote"><span>Rankings provided by Melon</span><span>Playlist refreshes every 5 minutes</span></div>
          </section>

          <section class="charting-board" aria-labelledby="charting-title">
            <div class="charting-heading">
              <div><div class="section-overline">CHARTING TRACKS</div><h2 id="charting-title">Songs on the charts</h2><p>Browse your charting playlist by song or by chart.</p></div>
              <div class="charting-view-toggle" role="group" aria-label="Organize charting songs">
                <button type="button" class="charting-view-button is-active" data-charting-view="song" aria-pressed="true">♫ <span>Song</span></button>
                <button type="button" class="charting-view-button" data-charting-view="chart" aria-pressed="false">▦ <span>Chart</span></button>
              </div>
            </div>
            <div id="charting-content" class="charting-content" aria-live="polite"></div>
          </section>
          <footer class="page-footer"><span>Made for the love of music.</span><span>Rankings provided by Melon · <a href="/health" target="_blank" rel="noreferrer">API status</a></span></footer>
        </div>
      </main>
    </div>
    <script type="module" src="/live-filter.js?v=1"></script>
  </body>
</html>`;
