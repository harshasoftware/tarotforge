import React, { useState, useRef } from 'react';
import { Edit2, Upload, X, Check } from 'lucide-react';
import { uploadProfileImage, updateUserProfileImage } from '../../lib/user-profile';
import { User } from '../../types';

interface ProfileImageUploadProps {
  user: User;
  onUpdate: (newImageUrl: string) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ user, onUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size and type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      setError('Please select a JPG, PNG, GIF, or WebP image.');
      return;
    }
    
    if (file.size > maxSize) {
      setError('Please select an image less than 5MB.');
      return;
    }
    
    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setShowPreview(true);
    setError(null);
    
    return () => URL.revokeObjectURL(objectUrl);
  };
  
  const handleUploadClick = async () => {
    if (!fileInputRef.current?.files?.[0]) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      const file = fileInputRef.current.files[0];
      
      // Upload to Supabase Storage
      const uploadedUrl = await uploadProfileImage(file, user.id);
      
      if (!uploadedUrl) {
        throw new Error('Failed to upload image to storage');
      }
      
      // Update user profile with new image URL
      const updated = await updateUserProfileImage(user.id, uploadedUrl);
      
      if (!updated) {
        throw new Error('Failed to update profile with new image');
      }
      
      // Update local state and parent component
      onUpdate(uploadedUrl);
      setUploadSuccess(true);
      setTimeout(() => {
        setShowPreview(false);
        setUploadSuccess(false);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
      
    } catch (err) {
      console.error('Error uploading profile image:', err);
      setError('Failed to upload profile image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelUpload = () => {
    setShowPreview(false);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  return (
    <div className="relative">
      <div className="aspect-square bg-primary/20 relative flex items-center justify-center overflow-hidden rounded-full">
        {user?.avatar_url ? (
          <img 
            src={user.avatar_url} 
            alt={user.username || 'User'} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-24 w-24 text-muted-foreground flex items-center justify-center">
            {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        )}
      </div>
      
      {/* Edit button */}
      <button 
        onClick={handleButtonClick}
        className="absolute bottom-2 right-2 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
        title="Change profile picture"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
      />
      
      {/* Preview modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl overflow-hidden max-w-md w-full">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-medium">Update Profile Picture</h3>
              <button 
                onClick={cancelUpload}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {uploadSuccess ? (
                <div className="text-center">
                  <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-success" />
                  </div>
                  <p className="font-medium">Profile picture updated successfully!</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 w-40 h-40 mx-auto rounded-full overflow-hidden">
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {error && (
                    <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={cancelUpload}
                      className="btn btn-ghost border border-input px-4 py-2"
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUploadClick}
                      className="btn btn-primary px-4 py-2 flex items-center"
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Save Photo
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileImageUpload;