import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/apiClient';

interface MediaDropzoneProps {
  attachedMedia: Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>;
  setAttachedMedia: React.Dispatch<
    React.SetStateAction<
      Array<{ filename: string; localPath: string; previewUrl: string; sizeKb: string }>
    >
  >;
  isUploadingMedia: boolean;
  setIsUploadingMedia: (b: boolean) => void;
}

export const MediaDropzone: React.FC<MediaDropzoneProps> = ({
  attachedMedia,
  setAttachedMedia,
  isUploadingMedia,
  setIsUploadingMedia,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachedMedia.length + files.length > 4) {
      toast.error('Maksimal 4 gambar per postingan tweet.');
      return;
    }

    setIsUploadingMedia(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} bukan format gambar yang valid.`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const imageBase64 = await base64Promise;

        const uploadRes = await apiClient.uploadMedia({
          imageBase64,
          filename: file.name,
        });

        if (uploadRes.success) {
          setAttachedMedia((prev) => [
            ...prev,
            {
              filename: uploadRes.filename,
              localPath: uploadRes.localPath,
              previewUrl: imageBase64,
              sizeKb: uploadRes.sizeKb,
            },
          ]);
          toast.success(`Gambar ${file.name} berhasil dilampirkan.`);
        }
      }
    } catch (err: any) {
      toast.error(`Gagal mengunggah media: ${err.message}`);
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setAttachedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/gif,image/webp"
        multiple
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadingMedia || attachedMedia.length >= 4}
        className="gap-1.5 border-amber-500/30 font-mono text-xs text-amber-300 hover:bg-amber-500/10"
      >
        {isUploadingMedia ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5 text-amber-400" />
        )}
        <span>+ Gambar ({attachedMedia.length}/4)</span>
      </Button>

      {/* Thumbnails list if any attached */}
      {attachedMedia.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {attachedMedia.map((media, i) => (
            <div
              key={i}
              className="group relative h-16 w-16 overflow-hidden rounded-md border border-slate-700 bg-obsidian-950"
            >
              <img
                src={media.previewUrl}
                alt={media.filename}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveMedia(i)}
                className="absolute right-1 top-1 rounded-full bg-black/80 p-0.5 text-slate-300 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                title="Hapus gambar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
