// Validação/máscara de telefone e CEP — tamanho apenas (não existe dígito
// verificador nesses formatos, ao contrário de CPF/CNPJ). Consolida helpers
// que estavam duplicados em Clientes.tsx/Armazens.tsx/Representantes.tsx.
// Campos opcionais: os call sites decidem se um valor vazio é aceitável,
// validarTelefone/validarCEP só julgam o formato de um valor não-vazio.

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function validarTelefone(value: string): boolean {
  const digitos = normalizePhone(value);
  return digitos.length === 10 || digitos.length === 11;
}

export function formatPhone(value: string): string {
  const digitos = normalizePhone(value);
  if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digitos.length === 10) return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return value;
}

export function maskPhoneInput(value: string): string {
  const cleaned = normalizePhone(value).slice(0, 11);
  if (cleaned.length === 11) return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (cleaned.length === 10) return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  if (cleaned.length > 6) return cleaned.replace(/^(\d{2})(\d{0,5})(\d{0,4})$/, "($1) $2-$3");
  if (cleaned.length > 2) return cleaned.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  if (cleaned.length > 0) return cleaned.replace(/^(\d{0,2})/, "($1");
  return "";
}

export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "");
}

export function validarCEP(value: string): boolean {
  return normalizeCep(value).length === 8;
}

export function formatCEP(value: string): string {
  const cleaned = normalizeCep(value).slice(0, 8);
  if (cleaned.length === 8) return cleaned.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  return value;
}

export function maskCEPInput(value: string): string {
  const cleaned = normalizeCep(value).slice(0, 8);
  if (cleaned.length > 5) return cleaned.replace(/^(\d{5})(\d{0,3})$/, "$1-$2");
  return cleaned;
}
