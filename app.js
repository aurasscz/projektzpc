/*
 * Říčany – porovnání staré a současné mapy (roleta).
 *
 * Stará mapa (CENIA) existuje jen v souřadnicovém systému S-JTSK (EPSG:5514),
 * kdežto OpenStreetMap a ortofoto jsou ve Web Mercatoru (EPSG:3857).
 * Proto si každou dlaždici staré mapy objednáme přes WMS ve S-JTSK a v prohlížeči
 * ji afinní transformací (CSS matrix) natočíme a zmenšíme tak, aby přesně
 * seděla na dlaždici Web Mercatoru. Obě vrstvy jsou tak v jedné mapě.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Nastavení
  // ---------------------------------------------------------------------------
  var START = { center: [49.99183, 14.65561], zoom: 14 };

  // S-JTSK / Křovák (EPSG:5514) se 7prvkovým posunem na WGS84.
  proj4.defs('EPSG:5514',
    '+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 ' +
    '+k=0.9999 +x_0=0 +y_0=0 +ellps=bessel ' +
    '+towgs84=570.8,85.7,462.8,4.998,1.587,5.261,3.56 +units=m +no_defs');
  var toKrovak = proj4('EPSG:4326', 'EPSG:5514');

  var CZ_BOUNDS = L.latLngBounds([48.5, 12.0], [51.1, 18.9]);
  var CENIA_ATTR = '© <a href="https://geoportal.gov.cz" title="Národní geoportál INSPIRE">CENIA</a>';

  var OLD_LAYERS = {
    iii: {
      url: 'https://gis.cenia.cz/mapcache/III_vojenske_mapovani/wms',
      layer: 'III_vojenske_mapovani',
      label: '1880',
      title: 'III. vojenské mapování (speciální mapa 1 : 75 000)'
    },
    ii: {
      url: 'https://gis.cenia.cz/mapcache/II_vojenske_mapovani/wms',
      layer: 'II_vojenske_mapovani',
      label: '≈ 1845',
      title: 'II. vojenské mapování (Čechy 1842–1852)'
    }
  };

  // ---------------------------------------------------------------------------
  // Pomocné výpočty
  // ---------------------------------------------------------------------------

  // Řešení soustavy 3×3 (Cramerovo pravidlo)
  function solve3(M, r) {
    function det(A) {
      return A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
             A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
             A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
    }
    var D = det(M);
    return [0, 1, 2].map(function (col) {
      var A = M.map(function (row, i) {
        return row.map(function (v, j) { return j === col ? r[i] : v; });
      });
      return det(A) / D;
    });
  }

  // Afinní transformace src -> dst metodou nejmenších čtverců.
  // Vrací [a, c, e, b, d, f] pro x' = a·u + c·v + e, y' = b·u + d·v + f.
  function fitAffine(src, dst) {
    var M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var rx = [0, 0, 0], ry = [0, 0, 0];
    src.forEach(function (s, i) {
      var row = [s[0], s[1], 1];
      for (var p = 0; p < 3; p++) {
        for (var q = 0; q < 3; q++) { M[p][q] += row[p] * row[q]; }
        rx[p] += row[p] * dst[i][0];
        ry[p] += row[p] * dst[i][1];
      }
    });
    return solve3(M, rx).concat(solve3(M, ry));
  }

  // ---------------------------------------------------------------------------
  // Vrstva: WMS v S-JTSK přepočítaná do Web Mercatoru
  // ---------------------------------------------------------------------------
  var KrovakWMS = L.GridLayer.extend({
    options: {
      url: '',
      layer: '',
      format: 'image/jpeg',
      tileSize: 256
    },

    createTile: function (coords, done) {
      var tile = document.createElement('div');
      tile.className = 'krovak-tile';
      var size = this.getTileSize();
      var map = this._map;
      var origin = coords.scaleBy(size);

      // Rohy a střed dlaždice (pixely Web Mercatoru) -> WGS84 -> S-JTSK
      var corners = [[0, 0], [size.x, 0], [0, size.y], [size.x, size.y], [size.x / 2, size.y / 2]];
      var k = corners.map(function (c) {
        var ll = map.unproject(origin.add(c), coords.z);
        return toKrovak.forward([ll.lng, ll.lat]);
      });

      // Obalový obdélník v S-JTSK s malou rezervou (proti mezerám na okrajích)
      var res = Math.hypot(k[1][0] - k[0][0], k[1][1] - k[0][1]) / size.x; // m na pixel
      var pad = res * 3;
      var xs = k.map(function (p) { return p[0]; });
      var ys = k.map(function (p) { return p[1]; });
      var minx = Math.min.apply(null, xs) - pad;
      var maxx = Math.max.apply(null, xs) + pad;
      var miny = Math.min.apply(null, ys) - pad;
      var maxy = Math.max.apply(null, ys) + pad;
      var W = Math.ceil((maxx - minx) / res);
      var H = Math.ceil((maxy - miny) / res);

      // Na displejích s vyšší hustotou pixelů si řekneme o ostřejší obrázek
      var dpr = Math.min(Math.round(window.devicePixelRatio || 1), 2);

      // Afinní transformace: pixel obrázku (u, v) -> pixel dlaždice (x, y),
      // vyrovnaná metodou nejmenších čtverců přes rohy a střed dlaždice.
      // Na ploše jedné dlaždice je zbytková chyba mezi projekcemi zanedbatelná
      // (od zoomu 12 pod 0,1 px).
      var src = k.map(function (p) {
        return [(p[0] - minx) / (maxx - minx) * W, (maxy - p[1]) / (maxy - miny) * H];
      });
      var m = fitAffine(src, corners);
      var a = m[0], c = m[1], e = m[2], b = m[3], d = m[4], f = m[5];

      var img = document.createElement('img');
      img.alt = '';
      img.setAttribute('role', 'presentation');
      img.decoding = 'async';
      img.style.width = W + 'px';
      img.style.height = H + 'px';
      img.style.transform = 'matrix(' + [a, b, c, d, e, f].map(function (n) {
        return n.toFixed(6);
      }).join(',') + ')';

      img.onload = function () { done(null, tile); };
      img.onerror = function () { done(new Error('Dlaždici staré mapy se nepodařilo načíst'), tile); };

      img.src = this.options.url +
        '?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap' +
        '&LAYERS=' + encodeURIComponent(this.options.layer) +
        '&STYLES=&SRS=EPSG:5514' +
        '&BBOX=' + [minx, miny, maxx, maxy].map(function (n) { return n.toFixed(2); }).join(',') +
        '&WIDTH=' + (W * dpr) + '&HEIGHT=' + (H * dpr) +
        '&FORMAT=' + encodeURIComponent(this.options.format);

      tile.appendChild(img);
      return tile;
    }
  });

  // ---------------------------------------------------------------------------
  // Mapa
  // ---------------------------------------------------------------------------
  var map = L.map('map', {
    zoomControl: false,
    minZoom: 8,
    maxZoom: 18,
    maxBounds: L.latLngBounds([48.2, 11.3], [51.4, 19.4]),
    maxBoundsViscosity: 0.8,
    attributionControl: false
  });

  // Střed mapy posuneme kousek pod cílový bod, aby značku nezakrýval úchyt rolety
  function centerAbove(latlng, zoom) {
    var p = map.project(latlng, zoom).add([0, 70]);
    return map.unproject(p, zoom);
  }

  map.setView(centerAbove(L.latLng(START.center), START.zoom), START.zoom);

  L.control.attribution({ prefix: '<a href="https://leafletjs.com">Leaflet</a>' }).addTo(map);

  // Panel staré mapy – leží nad současnou mapou a ořezává se roletou
  var oldPane = map.createPane('oldPane');
  oldPane.style.zIndex = 250;
  // Panel s čárou rolety – nad mapami i značkami (aby úchyt šel vždy chytit),
  // ale pod bublinami s popisem
  var swipePane = map.createPane('swipePane');
  swipePane.style.zIndex = 650;

  var nowLayers = {
    osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),
    orto: L.tileLayer('https://ags.cuzk.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Ortofoto © <a href="https://cuzk.gov.cz">ČÚZK</a>'
    })
  };

  var oldLayers = {};
  Object.keys(OLD_LAYERS).forEach(function (key) {
    var cfg = OLD_LAYERS[key];
    oldLayers[key] = new KrovakWMS({
      url: cfg.url,
      layer: cfg.layer,
      pane: 'oldPane',
      bounds: CZ_BOUNDS,
      minZoom: 8,
      maxNativeZoom: 16,
      maxZoom: 18,
      attribution: '<span title="' + cfg.title + '">' + CENIA_ATTR + '</span>'
    });
  });

  var currentOld = 'iii';
  var currentNow = 'osm';
  nowLayers[currentNow].addTo(map);
  oldLayers[currentOld].addTo(map);

  L.control.zoom({ position: 'topleft', zoomInTitle: 'Přiblížit', zoomOutTitle: 'Oddálit' }).addTo(map);

  // Tlačítko „Výchozí pohled“ pod tlačítky zoomu
  var HomeControl = L.Control.extend({
    onAdd: function () {
      var bar = L.DomUtil.create('div', 'leaflet-bar');
      var a = L.DomUtil.create('a', 'home-btn', bar);
      a.href = '#';
      a.title = 'Výchozí pohled';
      a.setAttribute('role', 'button');
      a.setAttribute('aria-label', 'Výchozí pohled');
      a.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
        '<path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linejoin="round"/></svg>';
      L.DomEvent.disableClickPropagation(bar);
      L.DomEvent.on(a, 'click', function (ev) { L.DomEvent.preventDefault(ev); resetView(); });
      return bar;
    }
  });
  new HomeControl({ position: 'topleft' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

  // Popisky „1880“ a „DNES“ v horních rozích
  function makeLabel(position, cls, text) {
    var Ctl = L.Control.extend({
      onAdd: function () {
        var el = L.DomUtil.create('div', 'map-label ' + cls);
        el.textContent = text;
        return el;
      }
    });
    var ctl = new Ctl({ position: position });
    ctl.addTo(map);
    return ctl.getContainer();
  }
  // Popisek musí být nad tlačítky zoomu -> přidáváme ho do rohu jako první
  var topLeft = map._controlCorners.topleft;
  var labelOld = makeLabel('topleft', 'map-label-old', OLD_LAYERS[currentOld].label);
  topLeft.insertBefore(labelOld, topLeft.firstChild);
  labelOld.title = OLD_LAYERS[currentOld].title;
  var labelNow = makeLabel('topright', 'map-label-now', 'DNES');

  // ---------------------------------------------------------------------------
  // Roleta
  // ---------------------------------------------------------------------------
  var ratio = 0.5; // poloha rolety jako podíl šířky mapy (0 = vlevo, 1 = vpravo)

  var swipe = L.DomUtil.create('div', 'swipe', swipePane);
  var swipeLine = L.DomUtil.create('div', 'swipe-line', swipe);
  var handle = L.DomUtil.create('div', 'swipe-handle', swipe);
  handle.setAttribute('role', 'slider');
  handle.setAttribute('tabindex', '0');
  handle.setAttribute('aria-label', 'Roleta: poměr staré a současné mapy');
  handle.setAttribute('aria-valuemin', '0');
  handle.setAttribute('aria-valuemax', '100');
  handle.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
    '<path d="M9 6l-6 6 6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function update() {
    var size = map.getSize();
    var x = Math.round(size.x * ratio);
    // Souřadnice uvnitř panelů = „layer point“ (posouvají se s mapou)
    var nw = map.containerPointToLayerPoint([0, 0]);
    var se = map.containerPointToLayerPoint(size);
    var cx = nw.x + x;

    var clip = 'polygon(' +
      nw.x + 'px ' + nw.y + 'px, ' + cx + 'px ' + nw.y + 'px, ' +
      cx + 'px ' + se.y + 'px, ' + nw.x + 'px ' + se.y + 'px)';
    oldPane.style.clipPath = clip;
    oldPane.style.webkitClipPath = clip;

    swipe.style.transform = 'translate(' + cx + 'px,' + nw.y + 'px)';
    swipe.style.height = size.y + 'px';
    swipeLine.style.height = size.y + 'px';
    handle.style.top = (size.y / 2) + 'px';
    handle.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    handle.setAttribute('aria-valuetext',
      'Stará mapa ' + Math.round(ratio * 100) + ' %, současná ' + Math.round((1 - ratio) * 100) + ' %');

    // Popisky schováme, když je roleta přes ně
    var mapRect = map.getContainer().getBoundingClientRect();
    var lo = labelOld.getBoundingClientRect();
    var ln = labelNow.getBoundingClientRect();
    labelOld.classList.toggle('is-hidden', x < lo.right - mapRect.left + 6);
    labelNow.classList.toggle('is-hidden', x > ln.left - mapRect.left - 6);
  }

  function setRatio(r) {
    ratio = Math.min(1, Math.max(0, r));
    update();
  }

  map.on('move zoom viewreset resize zoomend moveend', update);
  update();

  // Tažení myší i prstem (Pointer Events), bez posouvání mapy
  var dragging = false;
  function ratioFromEvent(ev) {
    var rect = map.getContainer().getBoundingClientRect();
    return (ev.clientX - rect.left) / rect.width;
  }
  function onDown(ev) {
    if (ev.button !== undefined && ev.button !== 0) { return; }
    dragging = true;
    swipe.classList.add('is-dragging');
    if (ev.currentTarget.setPointerCapture && ev.pointerId !== undefined) {
      try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* nic */ }
    }
    ev.preventDefault();
    ev.stopPropagation();
  }
  function onMove(ev) {
    if (!dragging) { return; }
    setRatio(ratioFromEvent(ev));
    ev.preventDefault();
    ev.stopPropagation();
  }
  function onUp(ev) {
    if (!dragging) { return; }
    dragging = false;
    swipe.classList.remove('is-dragging');
    ev.stopPropagation();
  }

  [handle, swipeLine].forEach(function (el) {
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    // Leaflet nesmí tyto události dostat (jinak by posouval mapu)
    L.DomEvent.disableClickPropagation(el);
    L.DomEvent.disableScrollPropagation(el);
    ['mousedown', 'touchstart', 'dblclick'].forEach(function (type) {
      el.addEventListener(type, function (ev) { ev.stopPropagation(); });
    });
  });

  // Ovládání klávesnicí
  handle.addEventListener('keydown', function (ev) {
    var step = { ArrowLeft: -0.05, ArrowRight: 0.05, PageDown: -0.2, PageUp: 0.2 }[ev.key];
    if (step !== undefined) { setRatio(ratio + step); ev.preventDefault(); }
    if (ev.key === 'Home') { setRatio(0); ev.preventDefault(); }
    if (ev.key === 'End') { setRatio(1); ev.preventDefault(); }
  });

  // ---------------------------------------------------------------------------
  // Přepínání vrstev
  // ---------------------------------------------------------------------------
  document.querySelectorAll('input[name="old"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked || input.value === currentOld) { return; }
      map.removeLayer(oldLayers[currentOld]);
      currentOld = input.value;
      oldLayers[currentOld].addTo(map);
      labelOld.textContent = OLD_LAYERS[currentOld].label;
      labelOld.title = OLD_LAYERS[currentOld].title;
      errorCount = 0;
      hideNotice();
      update();
    });
  });
  document.querySelectorAll('input[name="now"]').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!input.checked || input.value === currentNow) { return; }
      map.removeLayer(nowLayers[currentNow]);
      currentNow = input.value;
      nowLayers[currentNow].addTo(map);
    });
  });

  // Upozornění, když stará mapa nejde načíst (např. výpadek služby CENIA)
  var notice = document.getElementById('mapNotice');
  var errorCount = 0;
  function hideNotice() { notice.hidden = true; }
  Object.keys(oldLayers).forEach(function (key) {
    oldLayers[key].on('tileerror', function () {
      errorCount += 1;
      if (errorCount >= 4) {
        notice.textContent = 'Starou mapu se teď nedaří načíst ze serveru CENIA. Zkuste stránku obnovit později.';
        notice.hidden = false;
      }
    });
    oldLayers[key].on('tileload', function () {
      if (errorCount > 0) { errorCount -= 1; }
      if (errorCount === 0) { hideNotice(); }
    });
  });

  // ---------------------------------------------------------------------------
  // Zajímavá místa
  // ---------------------------------------------------------------------------
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function goTo(place, openPopup) {
    var latlng = L.latLng(place.lat, place.lon);
    var target = centerAbove(latlng, place.zoom);
    map.closePopup();
    setRatio(0.5);
    if (openPopup) {
      map.once('moveend', function () { place.marker.openPopup(); });
    }
    if (reduceMotion) {
      map.setView(target, place.zoom, { animate: false });
    } else {
      map.flyTo(target, place.zoom, { duration: 1.2 });
    }
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function popupContent(place) {
    var box = el('div', 'popup');
    box.appendChild(el('h3', 'popup-title', place.label + '. ' + place.name));
    var dl = el('dl');
    dl.appendChild(el('dt', 'then', 'Na staré mapě'));
    dl.appendChild(el('dd', null, place.then));
    dl.appendChild(el('dt', 'now', 'Dnes'));
    dl.appendChild(el('dd', null, place.now));
    box.appendChild(dl);
    var btn = el('button', 'btn', 'Přiblížit');
    btn.type = 'button';
    btn.addEventListener('click', function () { goTo(place, false); });
    box.appendChild(btn);
    return box;
  }

  var list = document.getElementById('placeList');
  (window.PLACES || []).forEach(function (place) {
    var icon = L.divIcon({
      className: 'place-marker',
      html: '<span>' + place.label + '</span>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -14]
    });
    place.marker = L.marker([place.lat, place.lon], {
      icon: icon,
      title: place.name,
      alt: place.name,
      riseOnHover: true
    }).bindPopup(popupContent(place), { maxWidth: 300, minWidth: 220, autoPanPadding: [16, 16] })
      .addTo(map);

    var li = el('li');
    var b = el('button', 'place-chip');
    b.type = 'button';
    b.appendChild(el('span', 'chip-num', place.label));
    b.appendChild(el('span', 'chip-name', place.name));
    b.addEventListener('click', function () {
      map.getContainer().scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      goTo(place, true);
    });
    li.appendChild(b);
    list.appendChild(li);
  });

  function resetView() {
    map.closePopup();
    setRatio(0.5);
    map.setView(centerAbove(L.latLng(START.center), START.zoom), START.zoom);
  }

  // Pro kontrolu z konzole prohlížeče
  window.ricanyMap = { map: map, setRatio: setRatio, oldLayers: oldLayers, toKrovak: toKrovak, fitAffine: fitAffine };
})();
