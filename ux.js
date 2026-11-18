/* ux.js – doplněk bez závislosti na app.js (načíst jako poslední, po app.js) */
(() => {
  'use strict';
  const mapWrap = document.querySelector('.map-wrap');
  const section = document.querySelector('.map-section');
  const content = document.querySelector('.content');
  if (!mapWrap || !section || !content) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reduce ? 'auto' : 'smooth';

  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  };

  content.id = content.id || 'obsah';

  /* Odkaz pro přeskočení mapy */
  const skip = make('a', 'skip-link', 'Přejít na text');
  skip.href = '#' + content.id;
  document.body.prepend(skip);

  /* Tlačítko „dolů“ – při aktivní mapě slouží jako východ z mapy */
  const down = make('a', 'scroll-down',
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>');
  down.href = '#' + content.id;
  down.setAttribute('aria-label', 'Přejít na text pod mapou');
  down.addEventListener('click', e => {
    e.preventDefault();
    content.scrollIntoView({ behavior, block: 'start' });
  });
  section.append(down);

  /* Ukazatel čtení a tlačítko zpět na mapu */
  const bar = make('div', 'read-progress');
  bar.setAttribute('aria-hidden', 'true');
  const back = make('button', 'to-map', '<span aria-hidden="true">↑</span> Mapa');
  back.type = 'button';
  back.setAttribute('aria-label', 'Zpět na mapu');
  back.addEventListener('click', () => window.scrollTo({ top: 0, behavior }));
  document.body.append(bar, back);

  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    document.body.classList.toggle('is-reading', scrollY > innerHeight * 0.35);
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener('resize', update);
  update();

  /* Nápověda k ovládání */
  const hint = document.querySelector('.map-section .hint');
  if (hint) hint.append(' Kliknutím na mapu ji aktivujete, šipka dole ji zase opustí.');
})();

/* ===== Část 2: procházení míst, sdílitelný odkaz, načítání ===== */
(() => {
  'use strict';
  const api = window.ricanyMap;
  if (!api) return;
  const map = api.map;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Procházení míst šipkami v bublině + zvýraznění v seznamu */
  const places = window.PLACES || [];
  const chips = [...document.querySelectorAll('.place-chip')];

  /* Značky při najetí nepřeskakují ve vrstvách (vypnutí riseOnHover z app.js) */
  places.forEach(p => { if (p.marker) p.marker.off('mouseover mouseout'); });

  let pending = null;
  const go = i => {
    const p = places[(i + places.length) % places.length];
    const target = map.unproject(map.project([p.lat, p.lon], p.zoom).add([0, 70]), p.zoom);
    map.closePopup();
    api.setRatio(0.5);
    if (pending) map.off('moveend', pending);
    pending = () => { pending = null; p.marker.openPopup(); };
    map.once('moveend', pending);
    if (reduce) map.setView(target, p.zoom, { animate: false });
    else map.flyTo(target, p.zoom, { duration: 1 });
  };
  map.on('popupopen', e => {
    const i = places.findIndex(p => p.marker && p.marker.getPopup() === e.popup);
    if (i < 0) return;
    chips.forEach((c, j) => {
      if (j === i) c.setAttribute('aria-current', 'true');
      else c.removeAttribute('aria-current');
    });
    const node = e.popup.getContent();
    if (!node || !node.querySelector || node.querySelector('.popup-nav')) return;
    const nav = document.createElement('div');
    nav.className = 'popup-nav';
    nav.innerHTML = '<button type="button" data-d="-1" aria-label="Předchozí místo">‹</button>' +
      '<span>' + (i + 1) + ' / ' + places.length + '</span>' +
      '<button type="button" data-d="1" aria-label="Další místo">›</button>';
    nav.addEventListener('click', ev => {
      const b = ev.target.closest('button');
      if (b) go(i + Number(b.dataset.d));
    });
    node.append(nav);
    e.popup.update();
  });
  map.on('popupclose', () => chips.forEach(c => c.removeAttribute('aria-current')));

  /* Kolečko u staré mapy při načítání */
  const label = document.querySelector('.map-label-old');
  Object.values(api.oldLayers).forEach(l => {
    l.on('loading', () => label && label.classList.add('is-busy'));
    l.on('load', () => label && label.classList.remove('is-busy'));
  });
  document.querySelectorAll('input[name="old"]').forEach(r =>
    r.addEventListener('change', () => label && label.classList.remove('is-busy')));

  /* Aktuální pohled v adrese (#m=zoom/lat/lng/roleta/stará/dnes) – jde sdílet i obnovit */
  const handle = document.querySelector('.swipe-handle');
  const checked = n => (document.querySelector('input[name="' + n + '"]:checked') || {}).value;
  const choose = (n, v) => {
    const r = document.querySelector('input[name="' + n + '"][value="' + v + '"]');
    if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
  };
  const m = /^#m=(\d+)\/(-?[\d.]+)\/(-?[\d.]+)\/(\d+)\/(\w+)\/(\w+)$/.exec(location.hash);
  if (m && isFinite(m[2]) && isFinite(m[3])) {
    map.setView([+m[2], +m[3]], +m[1], { animate: false });
    api.setRatio(Math.min(100, +m[4]) / 100);
    choose('old', m[5]);
    choose('now', m[6]);
  }
  let wt;
  const save = () => {
    clearTimeout(wt);
    wt = setTimeout(() => {
      const c = map.getCenter();
      const r = handle ? handle.getAttribute('aria-valuenow') : 50;
      try {
        history.replaceState(null, '', '#m=' + [map.getZoom(), c.lat.toFixed(5), c.lng.toFixed(5), r, checked('old'), checked('now')].join('/'));
      } catch (_) { /* nic */ }
    }, 500);
  };
  map.on('moveend zoomend', save);
  document.addEventListener('change', save);
  if (handle) ['pointerup', 'keyup'].forEach(ev => handle.addEventListener(ev, save));
})();

/* ===== Část 3: dva stavy – stránka / mapa ===== */
(() => {
  'use strict';
  const api = window.ricanyMap;
  const wrap = document.querySelector('.map-wrap');
  if (!api || !wrap) return;
  const map = api.map;
  const down = document.querySelector('.scroll-down');
  const content = document.querySelector('.content');
  const handlers = ['dragging', 'scrollWheelZoom', 'doubleClickZoom', 'touchZoom', 'boxZoom', 'keyboard'];

  const set = on => {
    document.body.classList.toggle('map-active', on);
    handlers.forEach(h => map[h] && map[h][on ? 'enable' : 'disable']());
    if (down) down.setAttribute('aria-label', on ? 'Opustit mapu' : 'Přejít na text pod mapou');
  };
  set(false);

  /* Aktivace kliknutím / klepnutím (při tahu prstem za stránkou se click nevyvolá).
     Roleta a ovládací prvky mapu neaktivují. */
  wrap.addEventListener('click', e => {
    if (e.target.closest('.swipe, .leaflet-control')) return;
    set(true);
  }, true);

  /* Východ: šipka (scroll na text řeší část 1) */
  if (down) down.addEventListener('click', () => set(false));

  /* Další způsoby, jak mapu opustit */
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  if (content) content.addEventListener('click', () => set(false));
  addEventListener('scroll', () => {
    if (scrollY > innerHeight * 0.35) set(false);
  }, { passive: true });
})();