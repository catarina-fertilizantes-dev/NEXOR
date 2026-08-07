-- Corrige lacuna encontrada em 2026-08-06: o enum "liberacao_status" em
-- produção nunca teve o valor 'cancelada' adicionado (só existia no Dev),
-- porque a auditoria original de reconciliação (20260806210000) comparou
-- apenas se os TIPOS existiam por nome, não a lista completa de valores de
-- enums já existentes dos dois lados. Efeito real: cancelar_liberacao()
-- (que tenta gravar status = 'cancelada') falhava em produção.
--
-- ADD VALUE IF NOT EXISTS é idempotente — seguro re-rodar no Dev, que já
-- tem o valor. Fica em sua própria migration (não misturado com outras
-- instruções) porque ALTER TYPE ... ADD VALUE não pode ser usado na mesma
-- transação/comando em que foi adicionado.

ALTER TYPE "public"."liberacao_status" ADD VALUE IF NOT EXISTS 'cancelada';
