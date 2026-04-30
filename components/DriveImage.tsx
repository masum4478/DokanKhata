
import React, { useState, useEffect } from 'react';
import { Loader2, ImageOff } from 'lucide-react';

interface DriveImageProps {
  src: string | null | undefined;
  className?: string;
  alt?: string;
  token?: string | null;
  onTokenExpired?: () => void;
}

const DriveImage: React.FC<DriveImageProps> = ({ src, className, alt, token, onTokenExpired }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImageUrl(null);
      return;
    }

    if (src.startsWith('drive://')) {
      if (!token) {
        setError(true);
        return;
      }

      const fileId = src.replace('drive://', '');
      const fetchImage = async () => {
        setIsLoading(true);
        setError(false);
        try {
          const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (response.status === 401) {
            console.error('Google token expired');
            if (onTokenExpired) onTokenExpired();
            throw new Error('TOKEN_EXPIRED');
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch Drive image ${fileId}:`, response.status, errorText);
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
          if (blob.size === 0) {
            throw new Error('Fetched blob is empty');
          }
          
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        } catch (e) {
          console.error('Error fetching Drive image:', e);
          setError(true);
        } finally {
          setIsLoading(false);
        }
      };

      fetchImage();
      
      return () => {
        if (imageUrl && imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(imageUrl);
        }
      };
    } else {
      setImageUrl(src);
      setIsLoading(false);
      setError(false);
    }
  }, [src, token]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className} rounded-lg`}>
        <ImageOff className="w-5 h-5 text-gray-300" />
      </div>
    );
  }

  return (
    <img 
      src={imageUrl} 
      className={className} 
      alt={alt || ''} 
      referrerPolicy="no-referrer"
      onError={() => {
        console.error('Image load failed:', imageUrl);
        setError(true);
      }}
    />
  );
};

export default DriveImage;
