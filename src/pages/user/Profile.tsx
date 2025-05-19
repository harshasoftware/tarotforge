import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User as UserIcon, Mail, Lock, Upload, Check, Save, Shield, AlertCircle, Camera, RefreshCw, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ImageCropper from '../../components/profile/ImageCropper';
import { uploadProfileImage, updateUserProfile, updateUserPassword, getUserProfile } from '../../lib/user-profile';
import { Link } from 'react-router-dom';

interface ProfileFormData {
  username: string;
  email: string;
  bio: string;
  isCreator: boolean;
  isReader: boolean;
}

interface PasswordFormData {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile = () => {
  const { user, checkAuth } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url || null);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Stats state
  const [createdDecksCount, setCreatedDecksCount] = useState(0);
  const [ownedDecksCount, setOwnedDecksCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile form
  const { 
    register, 
    handleSubmit,
    reset, 
    formState: { errors } 
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      bio: user?.bio || '',
      isCreator: user?.is_creator || false,
      isReader: user?.is_reader || false,
    }
  });
  
  // Password form
  const { 
    register: registerPassword, 
    handleSubmit: handlePasswordSubmit, 
    formState: { errors: passwordErrors },
    watch
  } = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });
  
  // Watch password fields to compare them
  const newPassword = watch('newPassword');
  
  // Fetch user profile data on mount
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      
      try {
        const profile = await getUserProfile(user.id);
        if (profile) {
          reset({
            username: profile.username || '',
            email: profile.email,
            bio: profile.bio || '',
            isCreator: profile.is_creator || false,
            isReader: profile.is_reader || false
          });
          
          setAvatarUrl(profile.avatar_url || null);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    
    loadUserProfile();
    
    // Also fetch deck counts (this could be implemented with real data later)
    fetchDeckCounts();
  }, [user, reset]);
  
  // Fetch deck counts from Supabase
  const fetchDeckCounts = async () => {
    if (!user) return;
    
    try {
      // In a real app, these would be fetched from Supabase
      // For now, using mock counts
      setCreatedDecksCount(3);
      setOwnedDecksCount(7);
    } catch (error) {
      console.error('Error fetching deck counts:', error);
    }
  };
  
  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    
    try {
      setSaving(true);
      setSaveError(null);
      
      // Format data for Supabase
      const profileData = {
        username: data.username,
        bio: data.bio,
        is_creator: data.isCreator,
        is_reader: data.isReader
      };
      
      // Update profile in Supabase
      const { success, error } = await updateUserProfile(user.id, profileData);
      
      if (!success) {
        throw new Error(error || 'Failed to update profile');
      }
      
      // Refresh auth context
      await checkAuth();
      
      setSaving(false);
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Reset success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSaveError(error.message || 'An error occurred while saving your profile.');
      setSaving(false);
    }
  };
  
  // Handle password change
  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user) return;
    
    try {
      setIsChangingPassword(true);
      setPasswordError(null);
      
      // Update password in Supabase
      const { success, error } = await updateUserPassword(data.newPassword);
      
      if (!success) {
        throw new Error(error || 'Failed to update password');
      }
      
      setIsChangingPassword(false);
      setPasswordChanged(true);
      setShowPasswordForm(false);
      
      // Reset success message after 3 seconds
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'An error occurred while updating your password.');
      setIsChangingPassword(false);
    }
  };
  
  // Handle clicking the profile picture upload button
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type and size
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      alert('Please select a JPG, PNG, GIF, or WebP image.');
      return;
    }
    
    if (file.size > maxSize) {
      alert('Please select an image less than 5MB in size.');
      return;
    }
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageDataUrl = e.target?.result as string;
      setSelectedImage(imageDataUrl);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle cropper completion
  const handleCropComplete = async (croppedImage: string) => {
    if (!user) return;
    
    setShowCropper(false);
    setIsUploadingImage(true);
    
    try {
      // Convert base64 to blob
      const response = await fetch(croppedImage);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const imageUrl = await uploadProfileImage(blob, user.id);
      
      if (imageUrl) {
        // Update user profile with new avatar URL
        await updateUserProfile(user.id, { avatar_url: imageUrl });
        
        // Update local state
        setAvatarUrl(imageUrl);
        
        // Refresh auth context
        await checkAuth();
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
    } finally {
      setIsUploadingImage(false);
      setSelectedImage(null);
    }
  };
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif font-bold mb-8 mt-8">Your Profile</h1>
          
          {/* Success message */}
          {saveSuccess && (
            <div className="mb-6 p-4 border border-success/30 bg-success/10 rounded-lg flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-sm text-success">Your profile has been updated successfully.</p>
            </div>
          )}
          
          {/* Error message */}
          {saveError && (
            <div className="mb-6 p-4 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{saveError}</p>
            </div>
          )}
          
          {/* Password success message */}
          {passwordChanged && (
            <div className="mb-6 p-4 border border-success/30 bg-success/10 rounded-lg flex items-start gap-3">
              <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
              <p className="text-sm text-success">Your password has been updated successfully.</p>
            </div>
          )}
          
          {/* Password error message */}
          {passwordError && (
            <div className="mb-6 p-4 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{passwordError}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Profile Sidebar */}
            <div className="md:col-span-1">
              <motion.div 
                className="bg-card rounded-xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Profile Image */}
                <div className="aspect-square bg-primary/20 relative flex items-center justify-center">
                  {isUploadingImage ? (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    </div>
                  ) : null}
                  
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={user?.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-24 w-24 text-muted-foreground" />
                  )}
                  
                  {/* Upload button */}
                  <button 
                    onClick={handleUploadClick}
                    className="absolute bottom-4 right-4 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                    title="Upload profile picture"
                  >
                    <Camera className="h-5 w-5" />
                  </button>
                  
                  {/* Hidden file input */}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                  />
                </div>
                
                <div className="p-4">
                  <h2 className="font-serif font-bold text-xl">{user?.username || user?.email?.split('@')[0] || 'User'}</h2>
                  <p className="text-muted-foreground text-sm mt-1">Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}</p>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold">{createdDecksCount}</p>
                        <p className="text-sm text-muted-foreground">Created</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{ownedDecksCount}</p>
                        <p className="text-sm text-muted-foreground">Purchased</p>
                      </div>
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full btn btn-primary mt-4 py-2"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </motion.div>
              
              {/* Account Security */}
              <motion.div 
                className="bg-card rounded-xl border border-border overflow-hidden mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="p-4">
                  <div className="flex items-center mb-4">
                    <Shield className="h-5 w-5 mr-2 text-muted-foreground" />
                    <h3 className="font-medium">Account Security</h3>
                  </div>
                  
                  <button 
                    className="w-full btn btn-secondary py-2 mb-3 flex items-center justify-center"
                    disabled={true}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Change Email
                    <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full">Coming Soon</span>
                  </button>
                  
                  <button 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="w-full btn btn-secondary py-2 flex items-center justify-center"
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    {showPasswordForm ? 'Hide Password Form' : 'Change Password'}
                  </button>
                  
                  {/* Password change form */}
                  {showPasswordForm && (
                    <form 
                      onSubmit={handlePasswordSubmit(onPasswordSubmit)}
                      className="mt-4 border-t border-border pt-4"
                    >
                      <div className="space-y-4">
                        {user && user.id && user.id.startsWith('google-') && (
                          <div className="p-3 bg-primary/10 rounded-lg">
                            <p className="text-sm flex items-start">
                              <Key className="h-4 w-4 mr-2 mt-0.5 text-primary" />
                              You signed up with Google. Creating a password will let you sign in with email too.
                            </p>
                          </div>
                        )}
                        
                        {!user?.id?.startsWith('google-') && (
                          <div className="space-y-2">
                            <label htmlFor="currentPassword" className="block text-sm font-medium">
                              Current Password
                            </label>
                            <input
                              id="currentPassword"
                              type="password"
                              {...registerPassword('currentPassword')}
                              className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-2">
                          <label htmlFor="newPassword" className="block text-sm font-medium">
                            New Password
                          </label>
                          <input
                            id="newPassword"
                            type="password"
                            {...registerPassword('newPassword', { 
                              required: 'New password is required',
                              minLength: {
                                value: 8,
                                message: 'Password must be at least 8 characters'
                              }
                            })}
                            className={`w-full p-2 rounded-md border ${
                              passwordErrors.newPassword ? 'border-destructive' : 'border-input'
                            } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                          />
                          {passwordErrors.newPassword && (
                            <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="block text-sm font-medium">
                            Confirm New Password
                          </label>
                          <input
                            id="confirmPassword"
                            type="password"
                            {...registerPassword('confirmPassword', {
                              required: 'Please confirm your password',
                              validate: (value) => value === newPassword || 'Passwords do not match'
                            })}
                            className={`w-full p-2 rounded-md border ${
                              passwordErrors.confirmPassword ? 'border-destructive' : 'border-input'
                            } bg-background focus:outline-none focus:ring-2 focus:ring-primary`}
                          />
                          {passwordErrors.confirmPassword && (
                            <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>
                          )}
                        </div>
                        
                        <button 
                          type="submit"
                          className="w-full btn btn-primary py-2 flex items-center justify-center"
                          disabled={isChangingPassword}
                        >
                          {isChangingPassword ? (
                            <>
                              <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></span>
                              Updating...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Password
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </motion.div>
              
              {/* Account Links */}
              <motion.div
                className="bg-card rounded-xl border border-border overflow-hidden mt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="p-4">
                  <h3 className="font-medium mb-3">Quick Links</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <Link to="/collection" className="text-primary hover:underline flex items-center">
                        <span className="w-6 inline-block">🗃️</span> My Collection
                      </Link>
                    </li>
                    <li>
                      <Link to="/create-deck" className="text-primary hover:underline flex items-center">
                        <span className="w-6 inline-block">✨</span> Create New Deck
                      </Link>
                    </li>
                    <li>
                      <Link to="/reading-room" className="text-primary hover:underline flex items-center">
                        <span className="w-6 inline-block">🔮</span> Reading Room
                      </Link>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
            
            {/* Profile Details */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="bg-card rounded-xl border border-border p-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label htmlFor="username" className="block text-sm font-medium">
                        Username
                      </label>
                      <input
                        id="username"
                        type="text"
                        disabled={!isEditing}
                        className={`w-full p-2 rounded-md border ${
                          errors.username ? 'border-destructive' : 'border-input'
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed`}
                        {...register('username', { required: 'Username is required' })}
                      />
                      {errors.username && (
                        <p className="text-sm text-destructive mt-1">{errors.username.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        disabled={true} // Email should not be editable directly
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                        {...register('email')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed directly. Please contact support for assistance.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="bio" className="block text-sm font-medium">
                        Bio
                      </label>
                      <textarea
                        id="bio"
                        rows={4}
                        disabled={!isEditing}
                        placeholder="Tell others about yourself..."
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                        {...register('bio')}
                      ></textarea>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium">Creator Preferences</h3>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isCreator"
                          className="rounded border-input bg-background focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                          disabled={!isEditing}
                          {...register('isCreator')}
                        />
                        <label htmlFor="isCreator" className="text-sm">
                          I want to create and sell tarot decks
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isReader"
                          className="rounded border-input bg-background focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                          disabled={!isEditing}
                          {...register('isReader')}
                        />
                        <label htmlFor="isReader" className="text-sm">
                          I want to offer tarot reading services
                        </label>
                      </div>
                      
                      {isEditing && (
                        <div className="p-3 border border-primary/30 bg-primary/5 rounded-lg mt-3">
                          <p className="text-sm">
                            Enabling creator or reader features will allow you to sell decks or offer reading services once these features are available.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {isEditing && (
                      <div className="pt-4 flex justify-end space-x-3">
                        <button 
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="btn btn-ghost border border-input px-4 py-2"
                          disabled={saving}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className="btn btn-primary px-4 py-2 flex items-center"
                          disabled={saving}
                        >
                          {saving ? (
                            <>
                              <span className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
              
              {/* Account Activity */}
              <motion.div
                className="bg-card rounded-xl border border-border p-6 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <h3 className="text-xl font-serif font-medium mb-4">Account Activity</h3>
                <div className="space-y-4">
                  <div className="flex justify-between p-3 border-b border-border">
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-muted-foreground">Your account was created</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(user?.created_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex justify-between p-3 border-b border-border">
                    <div>
                      <p className="font-medium">Last Sign In</p>
                      <p className="text-sm text-muted-foreground">Most recent login to your account</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleString()} {/* This would ideally come from auth data */}
                    </p>
                  </div>
                  
                  <Link 
                    to="/collection" 
                    className="w-full btn btn-secondary py-2 mt-2 flex items-center justify-center"
                  >
                    View Activity History
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      
      {/* Image Cropper Modal */}
      {showCropper && selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setSelectedImage(null);
          }}
          aspectRatio={1}
        />
      )}
    </div>
  );
};

export default Profile;