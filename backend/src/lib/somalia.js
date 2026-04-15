/** Official region → capital (LAAS24 PRD) */
const REGION_CAPITAL = {
  Banaadir: "Mogadishu",
  "Woqooyi Galbeed": "Hargeisa",
  Awdal: "Borama",
  Togdheer: "Burao",
  Sool: "Las Anod",
  Sanaag: "Erigavo",
  Bari: "Bosaso",
  Nugaal: "Garowe",
  Mudug: "Galkayo",
  Galgaduud: "Dusmareb",
  Hiiraan: "Beledweyne",
  "Middle Shabelle": "Jowhar",
  "Lower Shabelle": "Merca",
  Bay: "Baidoa",
  Bakool: "Hudur",
  Gedo: "Garbaharey",
  "Middle Juba": "Bu'aale",
  "Lower Juba": "Kismayo",
};

function regions() {
  return Object.keys(REGION_CAPITAL);
}

function capitalForRegion(region) {
  return REGION_CAPITAL[region] ?? null;
}

function isValidRegionCapital(region, city) {
  const cap = capitalForRegion(region);
  return cap !== null && city === cap;
}

module.exports = { REGION_CAPITAL, regions, capitalForRegion, isValidRegionCapital };
