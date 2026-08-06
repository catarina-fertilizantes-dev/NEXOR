/**
 * Estado compartilhado entre os testes de sistema.
 * Escrito pelo setup admin e lido pelos testes de fluxo.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const STATE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'state.json');

export interface UserCred {
  email: string;
  tempPassword: string;
  finalPassword: string;
}

export interface SystemState {
  produto1Id?: string;
  produto1Nome?: string;
  armazem1Id?: string;
  armazem1Nome?: string;
  armazem2Id?: string;
  armazem2Nome?: string;
  representante1Id?: string;
  cliente1Id?: string;
  cliente1Nome?: string;
  cliente2Id?: string;
  liberacao1Id?: string;
  users: {
    armazem1?: UserCred;
    armazem2?: UserCred;
    cliente1?: UserCred;
    cliente2?: UserCred;
    representante1?: UserCred;
    colaborador1?: UserCred;
  };
}

export function readState(): SystemState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  } catch {
    return { users: {} };
  }
}

export function writeState(state: SystemState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function updateState(partial: Partial<SystemState>): void {
  const current = readState();
  writeState({ ...current, ...partial, users: { ...current.users, ...(partial.users ?? {}) } });
}
