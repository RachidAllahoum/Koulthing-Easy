/**
 * Static delivery matrix for Algeria (58 wilayas), inspired by common e‑commerce tiers:
 * - North / major hubs: bureau ~500 DZD, home ~750 DZD
 * - South / deep logistics: bureau ~1200 DZD, home ~1800 DZD
 * Replace with API or admin config when ready.
 */

export type DeliveryBand = "north" | "south"
export type DeliveryMode = "bureau" | "home"

export interface WilayaDelivery {
  /** Official wilaya code 01–58 */
  code: string
  /** Display name (French, as on many storefronts) */
  name: string
  band: DeliveryBand
}

export const DELIVERY_BAND_RATES: Record<
  DeliveryBand,
  { bureau: number; home: number; bureauEta: string; homeEta: string }
> = {
  north: {
    bureau: 500,
    home: 750,
    bureauEta: "5–8 working days (pickup at bureau)",
    homeEta: "3–5 working days (home delivery)",
  },
  south: {
    bureau: 1200,
    home: 1800,
    bureauEta: "8–14 working days (pickup at bureau)",
    homeEta: "5–9 working days (home delivery)",
  },
}

/**
 * All 58 wilayas. `band` groups approximate courier “north vs south” pricing used by large Algerian marketplaces.
 */
export const ALGERIA_WILAYAS: WilayaDelivery[] = [
  { code: "01", name: "Adrar", band: "south" },
  { code: "02", name: "Chlef", band: "north" },
  { code: "03", name: "Laghouat", band: "north" },
  { code: "04", name: "Oum El Bouaghi", band: "north" },
  { code: "05", name: "Batna", band: "north" },
  { code: "06", name: "Béjaïa", band: "north" },
  { code: "07", name: "Biskra", band: "south" },
  { code: "08", name: "Béchar", band: "south" },
  { code: "09", name: "Blida", band: "north" },
  { code: "10", name: "Bouira", band: "north" },
  { code: "11", name: "Tamanrasset", band: "south" },
  { code: "12", name: "Tébessa", band: "north" },
  { code: "13", name: "Tlemcen", band: "north" },
  { code: "14", name: "Tiaret", band: "north" },
  { code: "15", name: "Tizi Ouzou", band: "north" },
  { code: "16", name: "Alger", band: "north" },
  { code: "17", name: "Djelfa", band: "north" },
  { code: "18", name: "Jijel", band: "north" },
  { code: "19", name: "Sétif", band: "north" },
  { code: "20", name: "Saïda", band: "north" },
  { code: "21", name: "Skikda", band: "north" },
  { code: "22", name: "Sidi Bel Abbès", band: "north" },
  { code: "23", name: "Annaba", band: "north" },
  { code: "24", name: "Guelma", band: "north" },
  { code: "25", name: "Constantine", band: "north" },
  { code: "26", name: "Médéa", band: "north" },
  { code: "27", name: "Mostaganem", band: "north" },
  { code: "28", name: "M'Sila", band: "north" },
  { code: "29", name: "Mascara", band: "north" },
  { code: "30", name: "Ouargla", band: "south" },
  { code: "31", name: "Oran", band: "north" },
  { code: "32", name: "El Bayadh", band: "south" },
  { code: "33", name: "Illizi", band: "south" },
  { code: "34", name: "Bordj Bou Arreridj", band: "north" },
  { code: "35", name: "Boumerdès", band: "north" },
  { code: "36", name: "El Tarf", band: "north" },
  { code: "37", name: "Tindouf", band: "south" },
  { code: "38", name: "Tissemsilt", band: "north" },
  { code: "39", name: "El Oued", band: "south" },
  { code: "40", name: "Khenchela", band: "north" },
  { code: "41", name: "Souk Ahras", band: "north" },
  { code: "42", name: "Tipaza", band: "north" },
  { code: "43", name: "Mila", band: "north" },
  { code: "44", name: "Aïn Defla", band: "north" },
  { code: "45", name: "Naâma", band: "south" },
  { code: "46", name: "Aïn Témouchent", band: "north" },
  { code: "47", name: "Ghardaïa", band: "south" },
  { code: "48", name: "Relizane", band: "north" },
  { code: "49", name: "Timimoun", band: "south" },
  { code: "50", name: "Bordj Badji Mokhtar", band: "south" },
  { code: "51", name: "Ouled Djellal", band: "south" },
  { code: "52", name: "Béni Abbès", band: "south" },
  { code: "53", name: "In Salah", band: "south" },
  { code: "54", name: "In Guezzam", band: "south" },
  { code: "55", name: "Touggourt", band: "south" },
  { code: "56", name: "Djanet", band: "south" },
  { code: "57", name: "El M'Ghair", band: "south" },
  { code: "58", name: "El Menia", band: "south" },
]

const byCode = new Map(ALGERIA_WILAYAS.map((w) => [w.code, w]))

export function getWilayaByCode(code: string): WilayaDelivery | undefined {
  const normalized = code.trim().padStart(2, "0")
  return byCode.get(normalized)
}

export interface DeliveryQuote {
  price: number
  etaLabel: string
  band: DeliveryBand
  mode: DeliveryMode
}

export function getDeliveryQuote(wilayaCode: string, mode: DeliveryMode): DeliveryQuote | null {
  const w = getWilayaByCode(wilayaCode)
  if (!w) return null
  const r = DELIVERY_BAND_RATES[w.band]
  const price = mode === "bureau" ? r.bureau : r.home
  const etaLabel = mode === "bureau" ? r.bureauEta : r.homeEta
  return { price, etaLabel, band: w.band, mode }
}

export function formatWilayaOption(w: WilayaDelivery): string {
  return `${w.code} — ${w.name}`
}
