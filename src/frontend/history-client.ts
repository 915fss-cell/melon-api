export const historyClient = `const chartOptions=[
  {key:'top100',label:'Top 100'},
  {key:'hot100_30',label:'Hot 100 · 30d'},
  {key:'hot100_100',label:'Hot 100 · 100d'},
  {key:'day',label:'Daily'},
  {key:'week',label:'Weekly'},
  {key:'month',label:'Monthly'},
];
const $=(selector)=>document.querySelector(selector);
const params=new URLSearchParams(location.search);
const today=new Date();
const defaultTo=today.toISOString().slice(0,10);
today.setUTCDate(today.getUTCDate()-30);
const defaultFrom=today.toISOString().slice(0,10);
const initialChart=params.get('chart')||'all';
const state={
  from:params.get('from')||defaultFrom,
  to:params.get('to')||defaultTo,
  chart:chartOptions.some((chart)=>chart.key===initialChart)?initialChart:'all',
  query:params.get('q')||'',
  sort:params.get('sort')||'date_desc',
  page:Math.max(1,Number.parseInt(params.get('page')||'1',10)||1),
  pageSize:[25,50,100].includes(Number(params.get('pageSize')))?Number(params.get('pageSize')):25,
  track:params.get('track')||'',
  at:params.get('at')||'',
  timer:null,
  requestId:0,
  data:null,
  historyView:'song',
};
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}
function kstDateTimeValue(date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);const part=(type)=>parts.find((item)=>item.type===type)?.value||'00';return part('year')+'-'+part('month')+'-'+part('day')+'T'+part('hour')+':'+part('minute')}
function formatKstDateTime(value){return new Intl.DateTimeFormat(undefined,{timeZone:'Asia/Seoul',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value))}
function syncUrl(){const url=new URL(location.href);['from','to','chart','q','sort','page','pageSize','track','at'].forEach((key)=>url.searchParams.delete(key));if(state.from)url.searchParams.set('from',state.from);if(state.to)url.searchParams.set('to',state.to);if(state.at)url.searchParams.set('at',state.at);if(state.chart!=='all')url.searchParams.set('chart',state.chart);if(state.query)url.searchParams.set('q',state.query);if(state.sort!=='date_desc')url.searchParams.set('sort',state.sort);if(state.page>1)url.searchParams.set('page',String(state.page));if(state.pageSize!==25)url.searchParams.set('pageSize',String(state.pageSize));if(state.track)url.searchParams.set('track',state.track);history.replaceState({},'',url.pathname+url.search);}
function requestUrl(){const query=new URLSearchParams({from:state.from,to:state.to,chart:state.chart,market:'KR',q:state.query,sort:state.sort,page:String(state.page),pageSize:String(state.pageSize)});if(state.at)query.set('at',state.at);if(state.track)query.set('track',state.track);return '/api/playlist/history?'+query.toString();}
function formatDate(value,options){if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return '—';return new Intl.DateTimeFormat(undefined,{timeZone:'Asia/Seoul',...(options||{month:'short',day:'2-digit',year:'numeric'})}).format(date)}
function setStatus(message,tone){const status=$('#history-state');status.textContent=message;status.dataset.tone=tone||'';status.hidden=!message;}
function encodeTrendUrl(row){const url=new URL('/history',location.origin);url.searchParams.set('from',state.from);url.searchParams.set('to',state.to);url.searchParams.set('chart',row.chartKey);url.searchParams.set('track',row.songId);url.searchParams.set('sort','date_asc');url.searchParams.set('pageSize','100');return url.pathname+url.search;}
function renderRows(rows){
  $('#history-rows').innerHTML=rows.map((row)=>{
    const movement=row.rankDelta===null?{label:'—',className:'is-unknown'}:row.rankDelta>0?{label:'↑ '+row.rankDelta,className:'is-up'}:row.rankDelta<0?{label:'↓ '+Math.abs(row.rankDelta),className:'is-down'}:{label:'—',className:'is-flat'};
    const melon=row.melonMovement;
    const melonMove=melon?.direction==='up'?'↑ '+melon.value:melon?.direction==='down'?'↓ '+melon.value:melon?.direction==='new'?'NEW':melon?.direction==='reentry'?'RE':melon?.direction==='static'?'—':'—';
    const artists=(row.artists||[]).map((artist)=>'<button type="button" class="history-artist-filter" data-artist-filter="'+escapeHtml(artist)+'">'+escapeHtml(artist)+'</button>').join('<span aria-hidden="true"> · </span>')||'<span>Artist not listed</span>';
    const songHref='https://www.melon.com/song/detail.htm?songId='+encodeURIComponent(row.songId);
    return '<tr><td><div class="history-date"><strong>'+escapeHtml(formatDate(row.capturedAt))+'</strong><span>Captured '+escapeHtml(formatDate(row.capturedAt,{hour:'numeric',minute:'2-digit'}))+(row.officialTime?' · Chart '+escapeHtml(row.officialTime):'')+'</span></div></td><td><span class="history-chart-label">'+escapeHtml(row.chartLabel)+'</span></td><td><strong class="history-rank">#'+escapeHtml(row.rank)+'</strong></td><td><span class="history-change '+movement.className+'" aria-label="Rank change versus previous saved position: '+escapeHtml(movement.label)+'">'+escapeHtml(movement.label)+'</span></td><td><span class="history-melon-move">'+escapeHtml(melonMove)+'</span></td><td><span class="history-peak">'+(Number.isInteger(row.peakRank)&&row.peakRank>0?'#'+escapeHtml(row.peakRank):'—')+'</span></td><td><div class="history-track-cell"><a class="history-track-title" href="'+songHref+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(row.title)+' ↗</a><div class="history-artist-list">'+artists+'</div></div></td><td><a class="history-trend-link" href="'+encodeTrendUrl(row)+'">Trend</a></td></tr>';
  }).join('');
}
function snapshotChartLabel(column){return column.key==='hot100_30'?'Hot 30d':column.key==='hot100_100'?'Hot 100d':column.label}
function snapshotCover(track){const title=escapeHtml(track.title||'Untitled track');const initials=String(track.title||'M').trim().split(/\\s+/).slice(0,2).map((part)=>part[0]||'').join('').toUpperCase()||'M';return track.imageUrl?'<img class="charting-cover" src="'+escapeHtml(track.imageUrl)+'" alt="Album artwork for '+title+'" loading="lazy" referrerpolicy="no-referrer" />':'<span class="charting-cover cover-fallback" aria-label="No album artwork">'+escapeHtml(initials)+'</span>'}
function snapshotMovement(position){const movement=position.movement||position.rankChange;if(movement?.direction==='up')return{text:'↑'+movement.value,className:'is-up',label:'Up '+movement.value};if(movement?.direction==='down')return{text:'↓'+movement.value,className:'is-down',label:'Down '+movement.value};if(movement?.direction==='new')return{text:'NEW',className:'is-up',label:'New entry'};if(movement?.direction==='reentry')return{text:'RE',className:'',label:'Re-entry'};if(movement?.direction==='static')return{text:'0',className:'is-flat',label:'No rank change (0)'};return{text:'—',className:'',label:'Movement unavailable'}}
function snapshotPeak(position){return Number.isInteger(position.peakRank)&&position.peakRank>0?'#'+String(position.peakRank).padStart(2,'0'):'—'}
function snapshotRankRow(track,column){const position=track.positions[column.key];const movement=snapshotMovement(position);const peak=snapshotPeak(position);const rank=Number.parseInt(position.rank,10);return '<div class="charting-rank-row"><span>'+escapeHtml(snapshotChartLabel(column))+'</span><span class="charting-position-time">'+escapeHtml(position.officialTime||'Time unavailable')+'</span><span class="charting-position-movement '+movement.className+'" aria-label="Movement: '+escapeHtml(movement.label)+'">'+movement.text+'</span><span class="charting-position-peak" aria-label="Peak rank: '+escapeHtml(peak)+'">'+peak+'</span><strong>'+(Number.isFinite(rank)?'#'+rank:escapeHtml(position.rank))+'</strong></div>'}
function snapshotChartRow(track,column){const position=track.positions[column.key];const movement=snapshotMovement(position);const peak=snapshotPeak(position);const rank=Number.parseInt(position.rank,10);return '<article class="charting-chart-row"><strong class="charting-chart-rank">'+(Number.isFinite(rank)?String(rank).padStart(2,'0'):escapeHtml(position.rank))+'</strong><span class="charting-chart-movement '+movement.className+'" aria-label="'+escapeHtml(movement.label)+'">'+movement.text+'</span><span class="charting-chart-peak" aria-label="Peak rank: '+escapeHtml(peak)+'">'+peak+'</span><div class="charting-chart-track">'+snapshotCover(track)+'<div class="charting-song-meta"><strong>'+escapeHtml(track.title||'Untitled track')+'</strong><span>'+escapeHtml((track.artists||[]).join(', ')||'Artist not listed')+'</span><em>'+escapeHtml(track.album||'Album not listed')+'</em></div></div></article>'}
function renderSnapshot(data){const board=$('#snapshot-charting');const active=Boolean(state.at);board.hidden=!active;$('#history-summary').hidden=active;$('#history-board').hidden=active;$('#track-detail').hidden=active||!state.track;if(!active)return;const snapshot=data.snapshot;const content=$('#snapshot-charting-content');if(!snapshot){content.innerHTML='<div class="charting-empty">No saved snapshot was found within one hour of this time. Choose another date or time.</div>';$('#snapshot-charting-time').textContent='No saved chart snapshot within one hour of the selected time.';return}$('#snapshot-charting-time').textContent='Selected chart time (KST): '+formatKstDateTime(state.at);const tracks=snapshot.tracks||[];if(!tracks.length){content.innerHTML='<div class="charting-empty">No charting songs were saved at this time for the selected filters.</div>';return}if(state.historyView==='chart'){content.innerHTML='<div class="charting-chart-grid">'+chartOptions.map((column)=>{const items=tracks.filter((track)=>track.positions?.[column.key]&&(!state.chart||state.chart==='all'||state.chart===column.key));if(!items.length)return '';return '<section class="charting-chart-card" aria-label="'+escapeHtml(snapshotChartLabel(column))+' chart"><header class="charting-chart-header"><h3>'+escapeHtml(snapshotChartLabel(column))+'</h3><span class="charting-chart-time">'+escapeHtml(items[0].positions[column.key]?.officialTime||'Date/time unavailable')+'</span><span class="charting-chart-count">'+items.length+' '+(items.length===1?'song':'songs')+'</span></header><div class="charting-table-head" aria-hidden="true"><span>RANK</span><span>MOVE</span><span>PEAK</span><span>TRACK</span></div><div class="charting-chart-rows">'+items.map((track)=>snapshotChartRow(track,column)).join('')+'</div></section>'}).join('')+'</div>';return}content.innerHTML='<div class="charting-song-grid">'+tracks.map((track)=>{const columns=chartOptions.filter((column)=>track.positions?.[column.key]&&(!state.chart||state.chart==='all'||state.chart===column.key));if(!columns.length)return '';return '<article class="charting-song-card"><div class="charting-song-header">'+snapshotCover(track)+'<div class="charting-song-meta"><strong>'+escapeHtml(track.title||'Untitled track')+'</strong><span>'+escapeHtml((track.artists||[]).join(', ')||'Artist not listed')+'</span><span class="charting-count">'+columns.length+' '+(columns.length===1?'chart':'charts')+'</span></div></div><div class="charting-song-ranks">'+columns.map((column)=>snapshotRankRow(track,column)).join('')+'</div></article>'}).join('')+'</div>'}
function chartSvg(entries,label){
  if(!entries.length)return '<div class="history-no-chart">No saved rank observations for this chart in the selected range.</div>';
  const width=720,height=230,left=50,right=14,top=20,bottom=32,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const maxRank=Math.max(10,Math.ceil(Math.max(...entries.map((entry)=>entry.rank))/10)*10);
  const point=(entry,index)=>({x:entries.length===1?left+plotWidth/2:left+index*plotWidth/(entries.length-1),y:top+(entry.rank-1)/(maxRank-1)*plotHeight});
  const points=entries.map(point);
  const linePath=points.map((item,index)=>(index?'L':'M')+item.x.toFixed(1)+' '+item.y.toFixed(1)).join(' ');
  const areaPath=linePath+' L '+points[points.length-1].x.toFixed(1)+' '+(top+plotHeight)+' L '+points[0].x.toFixed(1)+' '+(top+plotHeight)+' Z';
  const gridRanks=[1,Math.max(2,Math.round(maxRank/2)),maxRank];
  const grid=gridRanks.map((rank)=>{const y=top+(rank-1)/(maxRank-1)*plotHeight;return '<line class="rank-chart-grid" x1="'+left+'" y1="'+y.toFixed(1)+'" x2="'+(width-right)+'" y2="'+y.toFixed(1)+'"/><text x="4" y="'+(y+3).toFixed(1)+'">#'+rank+'</text>'}).join('');
  const circles=points.map((item,index)=>'<circle class="rank-chart-point" cx="'+item.x.toFixed(1)+'" cy="'+item.y.toFixed(1)+'" r="4"><title>'+escapeHtml(formatDate(entries[index].capturedAt))+': rank #'+entries[index].rank+'</title></circle>').join('');
  const labels='<text x="'+left+'" y="'+(height-8)+'">'+escapeHtml(formatDate(entries[0].capturedAt,{month:'short',day:'numeric'}))+'</text><text text-anchor="end" x="'+(width-right)+'" y="'+(height-8)+'">'+escapeHtml(formatDate(entries[entries.length-1].capturedAt,{month:'short',day:'numeric'}))+'</text>';
  return '<svg class="rank-chart-svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+escapeHtml(label)+' rank history, '+entries.length+' saved observations">'+grid+'<defs><linearGradient id="history-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d5f277"/><stop offset="100%" stop-color="#d5f277" stop-opacity="0"/></linearGradient></defs><path class="rank-chart-area" d="'+areaPath+'"/><path class="rank-chart-line" d="'+linePath+'"/>'+circles+labels+'</svg><div class="history-chart-caption"><span>Rank #1 is highest</span><span>'+entries.length+' saved observations</span></div>';
}
function renderTrackDetail(series){
  const panel=$('#track-detail');
  if(!state.track){panel.hidden=true;return;}
  panel.hidden=false;
  if(!series.length){$('#track-detail-title').textContent='Track history';$('#track-detail-subtitle').textContent='No saved observations for this track in the selected date range.';$('#track-chart').innerHTML='<div class="history-no-chart">Try widening the date range. No missing values are filled in.</div>';return;}
  const first=series[0];$('#track-detail-title').textContent=first.title;
  $('#track-detail-subtitle').textContent=(first.artists||[]).join(', ')+' · '+first.chartLabel+' · South Korea';
  const latest=series[series.length-1];
  const change=latest.rankDelta===null?'No earlier saved rank':latest.rankDelta>0?'Improved '+latest.rankDelta+' places':latest.rankDelta<0?'Fell '+Math.abs(latest.rankDelta)+' places':'No change';
  const chartSeries=series.filter((entry)=>entry.chartKey===state.chart||state.chart==='all');
  const groups=state.chart==='all'?chartOptions.filter((chart)=>chartSeries.some((entry)=>entry.chartKey===chart.key)).map((chart)=>({chart,entries:chartSeries.filter((entry)=>entry.chartKey===chart.key)})):[{chart:chartOptions.find((chart)=>chart.key===state.chart)||{key:first.chartKey,label:first.chartLabel},entries:chartSeries}];
  const metrics='<div class="history-detail-metrics"><span>Latest rank <strong>#'+latest.rank+'</strong></span><span>Change <strong>'+escapeHtml(change)+'</strong></span><span>Peak <strong>'+(Number.isInteger(latest.peakRank)&&latest.peakRank>0?'#'+latest.peakRank:'—')+'</strong></span></div>';
  $('#track-chart').innerHTML=metrics+groups.map((group)=>'<section class="history-detail-chart-group"><h3>'+escapeHtml(group.chart.label)+'</h3>'+chartSvg(group.entries,group.chart.label)+'</section>').join('');
}
function renderData(data){
  state.data=data;
  renderSnapshot(data);
  $('#history-total').textContent=new Intl.NumberFormat().format(data.total);
  $('#history-tracks').textContent=new Intl.NumberFormat().format(data.trackCount);
  $('#history-window').textContent=data.oldest&&data.newest?formatDate(data.oldest,{month:'short',day:'numeric'})+' — '+formatDate(data.newest,{month:'short',day:'numeric'}):'—';
  const rows=Array.isArray(data.rows)?data.rows:[];
  const hasRows=rows.length>0;
  $('#history-table-wrap').hidden=!hasRows;
  $('#history-empty').hidden=hasRows;
  if(hasRows)renderRows(rows);
  renderTrackDetail(data.trackSeries||[]);
  const pagination=$('#history-pagination');pagination.hidden=!hasRows||data.pageCount<=1;
  $('#page-status').textContent='Page '+data.page+' of '+Math.max(1,data.pageCount);
  $('#previous-page').disabled=data.page<=1;
  $('#next-page').disabled=data.page>=data.pageCount;
  setStatus(hasRows?data.total+' saved chart observations across '+data.trackCount+' tracks.':'', 'success');
}
async function loadData(){
  const requestId=++state.requestId;syncUrl();setStatus('Loading saved chart history…','');
  $('#history-table-wrap').hidden=true;$('#history-empty').hidden=true;
  try{
    const response=await fetch(requestUrl(),{headers:{Accept:'application/json'},cache:'no-store'});
    const data=await response.json();
    if(requestId!==state.requestId)return;
    if(!response.ok)throw new Error(data?.error?.message||'Could not load saved chart history.');
    renderData(data);
  }catch(error){
    if(requestId!==state.requestId)return;
    setStatus(error instanceof Error?error.message:'Could not load saved chart history.','error');
    $('#history-empty').hidden=true;$('#history-pagination').hidden=true;
    if(state.track){$('#track-detail').hidden=false;$('#track-chart').innerHTML='<div class="history-no-chart">Track history could not be loaded.</div>';}
  }
}
function updateFilters(){
  state.from=$('#date-from').value;state.to=$('#date-to').value;state.chart=$('#chart-filter').value;state.sort=$('#history-sort').value;state.pageSize=Number($('#page-size').value);state.query=$('#history-search').value.trim();state.track='';state.page=1;
  if(!state.from||!state.to||state.from>state.to){$('#date-from').setAttribute('aria-invalid',String(!state.from||state.from>state.to));$('#date-to').setAttribute('aria-invalid',String(!state.to||state.from>state.to));setStatus('Choose a valid date range. The start date must be on or before the end date.','error');return;}
  $('#date-from').removeAttribute('aria-invalid');$('#date-to').removeAttribute('aria-invalid');loadData();
}
$('#date-from').value=state.from;$('#date-to').value=state.to;$('#snapshot-at').value=state.at?kstDateTimeValue(new Date(state.at)):'';$('#chart-filter').value=state.chart;$('#history-search').value=state.query;$('#history-sort').value=state.sort;$('#page-size').value=String(state.pageSize);
document.querySelectorAll('[data-history-view]').forEach((button)=>button.addEventListener('click',()=>{state.historyView=button.dataset.historyView||'song';document.querySelectorAll('[data-history-view]').forEach((item)=>{const selected=item===button;item.classList.toggle('is-active',selected);item.setAttribute('aria-pressed',String(selected))});if(state.data)renderSnapshot(state.data)}));
function setSnapshotTime(value){state.at=value?new Date(value+':00+09:00').toISOString():'';state.track='';state.page=1;loadData();}
$('#snapshot-at').addEventListener('change',(event)=>setSnapshotTime(event.currentTarget.value));
function shiftSnapshot(amount){const input=$('#snapshot-at');const value=input.value||kstDateTimeValue(new Date());const base=new Date(value+':00Z');base.setUTCHours(base.getUTCHours()+amount);input.value=base.toISOString().slice(0,16);setSnapshotTime(input.value);}
$('#snapshot-previous').addEventListener('click',()=>shiftSnapshot(-1));$('#snapshot-next').addEventListener('click',()=>shiftSnapshot(1));$('#snapshot-previous-day').addEventListener('click',()=>shiftSnapshot(-24));$('#snapshot-next-day').addEventListener('click',()=>shiftSnapshot(24));
$('#snapshot-clear').addEventListener('click',()=>{state.at='';$('#snapshot-at').value='';loadData();});
$('#date-from').addEventListener('change',()=>{state.at='';$('#snapshot-at').value='';updateFilters();});$('#date-to').addEventListener('change',()=>{state.at='';$('#snapshot-at').value='';updateFilters();});$('#chart-filter').addEventListener('change',updateFilters);$('#history-sort').addEventListener('change',updateFilters);$('#page-size').addEventListener('change',updateFilters);
$('#history-search').addEventListener('input',(event)=>{state.query=event.currentTarget.value.trim();state.track='';state.page=1;window.clearTimeout(state.timer);state.timer=window.setTimeout(loadData,220);});
$('#previous-page').addEventListener('click',()=>{if(state.page>1){state.page-=1;loadData();}});$('#next-page').addEventListener('click',()=>{state.page+=1;loadData();});
$('#close-track-detail').addEventListener('click',()=>{state.track='';state.sort='date_desc';$('#history-sort').value=state.sort;state.page=1;loadData();});
document.addEventListener('click',(event)=>{const artistButton=event.target.closest('[data-artist-filter]');if(artistButton){state.query=artistButton.dataset.artistFilter||'';state.track='';state.page=1;$('#history-search').value=state.query;loadData();}});
loadData();
`;
