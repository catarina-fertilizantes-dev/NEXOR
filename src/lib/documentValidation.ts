// Validação de dígito verificador de CPF/CNPJ (algoritmo módulo 11 padrão).
// Usado hoje só no campo de texto livre da Transferência de Propriedade —
// os formulários de Clientes/Representantes/Armazéns ainda validam apenas o
// tamanho (11/14 dígitos), ver tarefa futura de padronização.

export function normalizeDocumento(value: string): string {
  return value.replace(/\D/g, "");
}

function calcularDigitoVerificador(digitos: string, pesos: number[]): number {
  const soma = digitos
    .split("")
    .reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCPF(value: string): boolean {
  const cpf = normalizeDocumento(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const d1 = calcularDigitoVerificador(cpf.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcularDigitoVerificador(cpf.slice(0, 9) + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
}

export function validarCNPJ(value: string): boolean {
  const cnpj = normalizeDocumento(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const d1 = calcularDigitoVerificador(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcularDigitoVerificador(cnpj.slice(0, 12) + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cnpj === cnpj.slice(0, 12) + String(d1) + String(d2);
}

export function validarCpfOuCnpj(value: string): boolean {
  const digitos = normalizeDocumento(value);
  if (digitos.length === 11) return validarCPF(digitos);
  if (digitos.length === 14) return validarCNPJ(digitos);
  return false;
}

export function formatarCpfCnpj(value: string): string {
  const digitos = normalizeDocumento(value);
  if (digitos.length === 11) {
    return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digitos.length === 14) {
    return digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value;
}
