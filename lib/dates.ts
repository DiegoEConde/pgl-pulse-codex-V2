// Toda fecha comercial usa Buenos Aires, independientemente del equipo del usuario.
export const OPERATIONAL_TIME_ZONE = "America/Argentina/Buenos_Aires";
export function operationalDate(value: Date | string = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: OPERATIONAL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  // Una fecha sin hora se interpreta al mediodía local para evitar cambiar de día por UTC.
  const date = new Date(value.length === 10 ? value + "T12:00:00-03:00" : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", { timeZone: OPERATIONAL_TIME_ZONE, day: "2-digit", month: "short", year: "numeric" }).format(date);
}
export function previousDate(value: string): string {
  const date = new Date(value + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
