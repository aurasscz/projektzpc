/*
 * Zajímavá místa na mapě – upravujte zde.
 *
 * Každé místo má:
 *   label – krátký text v kolečku na mapě (číslo)
 *   name  – název místa
 *   lat, lon – souřadnice WGS84 (desetinné stupně), ověřené z OpenStreetMap / Nominatim
 *   zoom  – přiblížení po kliknutí na „Přiblížit“ (14 = město, 15 = vesnice, 16 = čtvrť).
 *           Stará mapa má měřítko 1 : 75 000, při zoomu nad 16 už je hodně rozmazaná.
 *   then  – co je na místě na staré mapě
 *   now   – jak to vypadá dnes
 *
 * Pořadí v poli = pořadí v seznamu pod mapou.
 */
window.PLACES = [
  {
    label: '1',
    name: 'Masarykovo náměstí – historické centrum',
    lat: 49.99183, lon: 14.65561, zoom: 16,
    then: 'Náměstí je jádrem malého města. Kolem něj je hustá zástavba a z náměstí se paprskovitě rozbíhají cesty do okolních vesnic.',
    now: 'Půdorys náměstí zůstal zachován a je to stále střed města. Zástavba se ale od něj rozrostla do všech stran.'
  },
  {
    label: '2',
    name: 'Zřícenina hradu Říčany',
    lat: 49.99152, lon: 14.65186, zoom: 16,
    then: 'Hrad založili páni z Říčan kolem roku 1260, v husitských válkách byl dobyt a v 16. století zpustl. V době mapování byl už dávno zříceninou na západním okraji města.',
    now: 'Zbytky hradu jsou dnes obklopené zástavbou a jsou přístupné veřejnosti.'
  },
  {
    label: '3',
    name: 'Kostel sv. Petra a Pavla',
    lat: 49.99173, lon: 14.65460, zoom: 16,
    then: 'Kostel stojí u náměstí na stejném místě jako dnes. Patří k pevným bodům, podle kterých se obě mapy dají dobře porovnat.',
    now: 'Kostel je dominantou historického centra, jeho okolí se změnilo jen málo.'
  },
  {
    label: '4',
    name: 'Rybník Jureček',
    lat: 50.00076, lon: 14.67913, zoom: 16,
    then: 'Na staré mapě je zde okraj lesa nad údolím. Samotný rybník v měřítku 1 : 75 000 zřetelně zakreslený nevidíme.',
    now: 'Jureček je přírodní koupaliště s hospodou na severovýchodním okraji města, hned u lesa.'
  },
  {
    label: '5',
    name: 'Rybník Marvánek',
    lat: 49.98395, lon: 14.66021, zoom: 16,
    then: 'Jižně od města vidíme svahy a pole v mělkém údolí potoka. Rybník v tomto měřítku zřetelně zakreslený nevidíme.',
    now: 'Marvánek leží na Říčanském potoce jižně od centra. Ze západu k němu dnes sahá nová čtvrť rodinných domů.'
  },
  {
    label: '6',
    name: 'Nádraží Říčany – železnice',
    lat: 49.99771, lon: 14.66352, zoom: 16,
    then: 'Ano, železnice už v době mapování existovala: první vlak tudy projel 14. prosince 1871 (Dráha císaře Františka Josefa z Vídně do Prahy), od roku 1874 tu byla stanice s malou výpravní budovou. Na staré mapě je trať zakreslená jako silná černá čára s příčnými čárkami – a vede přesně tam, kde dnes.',
    now: 'Trať Praha – Benešov je dvoukolejná (od roku 1903) a elektrizovaná (od roku 1971). Nádraží je důležité pro dojíždění do Prahy.'
  },
  {
    label: '7',
    name: 'Komenského náměstí – nová zástavba',
    lat: 49.99139, lon: 14.66439, zoom: 16,
    then: 'Na staré mapě je zde nezastavěné návrší (světlá plocha obklopená šrafami svahů) mezi městem a železnicí, kolem jen pole a cesty.',
    now: 'Dnes je tu souvislá městská zástavba s bytovými domy a ulicemi – z volného návrší nezůstalo nic.'
  },
  {
    label: '8',
    name: 'Dálnice D1 u Kuří a Modletic',
    lat: 49.97749, lon: 14.61015, zoom: 15,
    then: 'Na staré mapě zde žádná silnice nevede – jsou tu jen pole a svahy mezi vesnicemi Kuří, Nupaky a Modletice.',
    now: 'Dálnice D1: úsek Praha (Spořilov) – Mirošovice byl otevřen 12. července 1971 jako vůbec první dálniční úsek v Československu. Kousek odtud se na ni napojuje Pražský okruh a kolem vyrostly velké sklady a průmyslové areály.'
  },
  {
    label: '9a',
    name: 'Kuří',
    lat: 49.98792, lon: 14.62062, zoom: 15,
    then: 'Samostatná ves s kostelem asi 2,5 km západně od Říčan, od města oddělená poli.',
    now: 'Kuří je dnes jednou ze sedmi částí Říčan, od města ho ale pořád oddělují pole. Ze západu se k vesnici přiblížila dálnice D1 s Pražským okruhem a sklady.'
  },
  {
    label: '9b',
    name: 'Strašín',
    lat: 50.00173, lon: 14.70277, zoom: 15,
    then: 'Malá ves východně od Říčan obklopená poli, jižně od ní je les.',
    now: 'Strašín je také částí Říčan, od města ho ale dál odděluje les a pole. Ves se rozrostla o nové rodinné domy podél silnic.'
  },
  {
    label: '10',
    name: 'Louňovice',
    lat: 49.98226, lon: 14.76174, zoom: 15,
    then: 'Malá ves s několika statky, ze západu, jihu i východu obklopená lesy (zelené plochy). Severně vede přímá silnice – dnešní Kutnohorská.',
    now: 'Louňovice jsou samostatná obec, která se mnohonásobně rozrostla – přibyly desítky ulic s rodinnými domy. Lesy kolem vesnice zůstaly.'
  }
];
