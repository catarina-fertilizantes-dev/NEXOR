interface BucketLimits {
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
}

// Limites de upload por bucket do Supabase Storage.
// Precisam ser mantidos manualmente em sincronia com a config real dos buckets
// (não há como ler isso do client com a anon key) — ver storage.buckets em cada projeto.
export const BUCKET_UPLOAD_LIMITS: Record<string, BucketLimits> = {
  "carregamento-fotos": {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  "carregamento-documentos": {
    maxSizeBytes: 7 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "application/xml", "text/xml"],
  },
  "estoque-documentos": {
    maxSizeBytes: 7 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "application/xml", "text/xml"],
  },
};

export type UploadBucket = keyof typeof BUCKET_UPLOAD_LIMITS;

export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Valida tamanho (sempre) e, opcionalmente, tipo MIME de um arquivo contra os
 * limites reais configurados no bucket do Supabase Storage — para rejeitar na
 * hora da seleção, antes de tentar o upload e receber um erro cru do Supabase.
 */
export function validateFileForBucket(
  file: File,
  bucket: UploadBucket,
  { checkMimeType = true }: { checkMimeType?: boolean } = {}
): FileValidationResult {
  const limits = BUCKET_UPLOAD_LIMITS[bucket];

  if (file.size > limits.maxSizeBytes) {
    return {
      valid: false,
      error: `O arquivo "${file.name}" tem ${formatFileSize(file.size)} — o limite é ${formatFileSize(limits.maxSizeBytes)}.`,
    };
  }

  if (checkMimeType && !limits.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não suportado para "${file.name}".`,
    };
  }

  return { valid: true };
}
