import { useState } from 'react';
import { UploadIcon, Cross2Icon } from '@radix-ui/react-icons';
import { ImageIcon } from 'lucide-react';
import { Button } from '@/components/Button';
import './ImageUploader.css';

interface ImageUploaderProps {
  /** Current image URL to display, or null for empty state. */
  imageUrl: string | null;
  /** Called when the user picks a new image. Receives the file path from the dialog. */
  onUpload: () => void;
  /** Called when the user removes the current image. */
  onRemove: () => void;
  /** Whether an upload is in progress. */
  loading?: boolean;
}

export function ImageUploader({ imageUrl, onUpload, onRemove, loading = false }: ImageUploaderProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="image-uploader">
      {imageUrl && !imgError ? (
        <div className="image-uploader__preview">
          <img
            src={imageUrl}
            alt="Entity image"
            className="image-uploader__image"
            loading="lazy"
            onError={() => setImgError(true)}
          />
          <div className="image-uploader__overlay">
            <Button variant="secondary" size="sm" onClick={onUpload} disabled={loading}>
              <UploadIcon width={14} height={14} />
              Replace
            </Button>
            <Button variant="danger" size="sm" onClick={onRemove} disabled={loading}>
              <Cross2Icon width={14} height={14} />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="image-uploader__empty"
          onClick={onUpload}
          disabled={loading}
        >
          <ImageIcon size={32} className="image-uploader__empty-icon" />
          <span className="image-uploader__empty-text">
            {loading ? 'Uploading...' : 'UploadIcon Image'}
          </span>
        </button>
      )}
    </div>
  );
}
