// src/hooks/usePhotoUpload.ts
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { validateFileForBucket, UploadBucket } from '@/lib/uploadValidation';

interface UsePhotoUploadProps {
  bucket: string;
  folder?: string;
}

interface UploadResult {
  url: string;
  path: string;
}

export const usePhotoUpload = ({ bucket, folder }: UsePhotoUploadProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadPhoto = async (
    file: File,
    customFileName?: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);

    try {
      const validation = validateFileForBucket(file, bucket as UploadBucket);
      if (!validation.valid) {
        toast({
          variant: 'destructive',
          title: 'Arquivo inválido',
          description: validation.error
        });
        return null;
      }

      // Gerar nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = customFileName || `foto-${timestamp}.${fileExtension}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData.publicUrl) {
        throw new Error('Erro ao obter URL da imagem');
      }

      toast({
        title: 'Foto enviada com sucesso!',
        description: 'A foto foi salva e anexada ao carregamento.'
      });

      return {
        url: urlData.publicUrl,
        path: filePath
      };

    } catch (error) {
      console.error('Erro no upload da foto:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar foto',
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadPhoto,
    isUploading
  };
};
