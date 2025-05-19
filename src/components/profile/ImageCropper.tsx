import { useState, useRef, useEffect } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { XCircle, Check, Upload } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropper = ({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 1
}: ImageCropperProps) => {
  const cropperRef = useRef<HTMLImageElement>(null);
  const [cropper, setCropper] = useState<Cropper>();
  const [loading, setLoading] = useState(false);

  // Ensure cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (cropper) {
        cropper.destroy();
      }
    };
  }, [cropper]);

  const handleCrop = () => {
    if (!cropper) return;
    
    setLoading(true);
    
    try {
      // Get cropped canvas as a base64 string
      const croppedCanvas = cropper.getCroppedCanvas({
        width: 300, // Final image width
        height: 300, // Final image height
        fillColor: '#000',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      // Convert to base64 string
      const croppedImage = croppedCanvas.toDataURL('image/jpeg', 0.9);
      
      // Pass the cropped image to the parent component
      onCropComplete(croppedImage);
    } catch (err) {
      console.error('Error cropping image:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl overflow-hidden max-w-md w-full">
        <div className="flex items-center justify-between bg-primary/10 p-4 border-b border-border">
          <h3 className="font-serif font-bold">Crop Image</h3>
          <button 
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="max-h-[60vh] overflow-hidden mb-4 bg-black/30 rounded-lg">
            <Cropper
              src={imageSrc}
              style={{ height: 300, width: '100%' }}
              // Cropper.js options
              aspectRatio={aspectRatio}
              guides={true}
              viewMode={1}
              dragMode="move"
              scalable={true}
              zoomable={true}
              autoCropArea={1}
              background={false}
              responsive={true}
              checkOrientation={false}
              onInitialized={(instance) => setCropper(instance)}
              ref={cropperRef}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mb-4 text-center">
            Drag to reposition, scroll to zoom, and use the handles to resize.
          </p>
          
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              className="btn btn-ghost border border-input px-4 py-2"
            >
              Cancel
            </button>
            <button 
              onClick={handleCrop}
              className="btn btn-primary px-4 py-2 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;