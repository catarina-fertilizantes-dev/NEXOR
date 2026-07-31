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

// Inverso de parseDateOnly: formata uma Date local como "YYYY-MM-DD" pra usar
// em filtros contra colunas `date` (ex: `.eq("data_retirada", ...)`). Nunca
// usar `date.toISOString()` (timestamp completo em UTC) nesses filtros: o
// Postgres/PostgREST trunca o literal pro texto Y-M-D sem ajustar fuso, e em
// fusos negativos (Brasil, UTC-3) o fim do dia local (23:59:59.999) já virou
// o dia seguinte em UTC — um filtro "até o fim de hoje" feito com
// endOfDayISO() silenciosamente também inclui o dia seguinte inteiro.
export function toDateOnlyISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
