import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Colunas Postgres `date` (sem horário, ex: data_retirada, data_liberacao)
// chegam como "YYYY-MM-DD". `new Date("YYYY-MM-DD")` é interpretado como
// meia-noite UTC, então em fusos negativos (Brasil, UTC-3) o dia exibido
// regride ao converter para local. Usar sempre parse/format manual para
// esse tipo de coluna — nunca `new Date(iso).toLocaleDateString(...)`.
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnlyBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}
