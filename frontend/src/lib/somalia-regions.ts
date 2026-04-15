/** Official Somalia regions → capitals (LAAS24 PRD) */
export const SOMALIA_REGION_CAPITAL: Record<string, string> = {
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

export const SOMALIA_REGIONS = Object.keys(SOMALIA_REGION_CAPITAL);

export function capitalForRegion(region: string): string {
  return SOMALIA_REGION_CAPITAL[region] ?? "";
}
