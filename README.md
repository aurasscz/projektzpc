# Říčany na staré a současné mapě

Školní projekt **Krajina – zadání 1.2: Porovnání staré mapy se současnou**
(Projekt Krajina – Historik, úkol 1.2).

Interaktivní mapa Říčan s **roletou**: vlevo je stará mapa z III. vojenského mapování
(≈ 1880), vpravo současná mapa. Tažením svislé čáry (myší, prstem nebo šipkami na klávesnici)
se odkrývá minulost nebo současnost. Obě vrstvy jsou v jedné mapě, takže se přibližují
a posouvají společně.

**Web:** https://aurasscz.github.io/projektzpc/

## Co stránka umí

- Roleta mezi starou a současnou mapou (myš, dotyk na mobilu, klávesnice).
- Vlevo přepínání **III. vojenské mapování (≈ 1880)** / **II. vojenské mapování (Čechy 1842–1852)**.
- Vpravo přepínání **OpenStreetMap** / **letecký snímek ČÚZK**.
- Očíslovaná zajímavá místa s popisem „na staré mapě × dnes“ a tlačítkem **Přiblížit**
  (přiblíží místo a nastaví roletu doprostřed). Stejná místa jsou i v seznamu pod mapou.
- Texty: úvod, co se změnilo, závěr a zdroje.

## Soubory

| Soubor       | Co obsahuje |
|--------------|-------------|
| `index.html` | Stránka – nadpis, autor, mapa, texty (úvod, co se změnilo, závěr, zdroje). |
| `style.css`  | Vzhled stránky, rolety a značek. |
| `app.js`     | Mapa (Leaflet), roleta, přepínání vrstev, přepočet staré mapy. |
| `places.js`  | **Data zajímavých míst** – upravujte zde. |

Žádný build krok – stačí soubory nahrát a otevřít `index.html`.

## Jak upravit místa

Všechna místa jsou v souboru `places.js`. Každé místo vypadá takto:

```js
{
  label: '6',                         // text v kolečku na mapě
  name: 'Nádraží Říčany – železnice', // název
  lat: 49.99771, lon: 14.66352,       // souřadnice (WGS84, desetinné stupně)
  zoom: 16,                           // přiblížení po kliknutí na „Přiblížit“
  then: 'Co je vidět na staré mapě…',
  now: 'Jak to vypadá dnes…'
},
```

- **Přidat místo:** zkopírujte celý blok `{ … },` a upravte hodnoty.
- **Smazat místo:** smažte celý jeho blok.
- **Souřadnice zjistíte** např. na [openstreetmap.org](https://www.openstreetmap.org):
  pravým tlačítkem na místo → „Ukázat adresu“ (zobrazí se šířka a délka),
  nebo na [mapy.cz](https://mapy.cz) kliknutím na místo (souřadnice ve formátu `49.99771N, 14.66352E`).
- **Zoom:** 14 = celé město, 15 = vesnice, 16 = čtvrť. Stará mapa má měřítko 1 : 75 000,
  takže při větším přiblížení už je rozmazaná.

## Jak upravit texty a autora

Vše je v `index.html` – stačí přepsat text mezi značkami. Jméno autora je v řádku
`Autor: <span class="author-name">[DOPLNÍM]</span>`.

## Spuštění na vlastním počítači

Stránku stačí otevřít v prohlížeči. Spolehlivější je ale malý lokální server
(některé prohlížeče omezují soubory otevřené přes `file://`):

```bash
python3 -m http.server 8000
# pak otevřít http://localhost:8000
```

## Nasazení (GitHub Pages)

Repozitář → **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
větev **main**, složka **/ (root)** → Save. Po minutě až dvou je web na
https://aurasscz.github.io/projektzpc/ a každý push do `main` ho automaticky aktualizuje.

## Mapové podklady

| Vrstva | Zdroj | Poznámka |
|--------|-------|----------|
| III. vojenské mapování | CENIA, WMS `https://gis.cenia.cz/mapcache/III_vojenske_mapovani/wms` | speciální mapy 1 : 75 000, jen S-JTSK (EPSG:5514) |
| II. vojenské mapování | CENIA, WMS `https://gis.cenia.cz/mapcache/II_vojenske_mapovani/wms` | jen S-JTSK (EPSG:5514) |
| Současná mapa | © přispěvatelé OpenStreetMap | dlaždice `tile.openstreetmap.org` |
| Letecký snímek | © ČÚZK | `https://ags.cuzk.cz/arcgis1/rest/services/ORTOFOTO_WM/MapServer` |

### Proč se stará mapa přepočítává

Služby CENIA s vojenskými mapováními dnes poskytují mapu **jen v souřadnicovém systému
S-JTSK (EPSG:5514)**. Původní služby na `geoportal.gov.cz` (ArcGIS WMTS/WMS) už nefungují
(HTTP 404). OpenStreetMap i ortofoto jsou ale ve Web Mercatoru (EPSG:3857).
Proto `app.js` pro každou dlaždici Web Mercatoru spočítá (knihovnou proj4js),
jakou oblast v S-JTSK pokrývá, stáhne ji přes WMS a pomocí CSS transformace ji natočí
a zmenší, aby přesně seděla. Odchylka je od zoomu 12 výš menší než desetina pixelu.

### Pozor na stáří mapových listů

Listy III. vojenského mapování se po roce 1880 ještě aktualizovaly. V okolí Říčan je proto
na staré mapě vidět i pozdější stav (např. „Vychovatelna manž. Olivových“ – dnešní Olivova
léčebna z počátku 20. století, vilová zástavba Radošovic). Severně od centra je vidět šev
mezi dvěma mapovými listy.

## Technika

[Leaflet 1.9.4](https://leafletjs.com) a [proj4js 2.11](https://proj4js.org) z CDN (cdnjs),
jinak čisté HTML, CSS a JavaScript.
