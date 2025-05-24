import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Mail, Save, Shield, AlertCircle, Check, Camera } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import ProfileImageUpload from '../../components/profile/ProfileImageUpload';
import { getUserProfile, updateUserProfile } from '../../lib/user-profile';
import { supabase } from '../../lib/supabase';
import { User } from '../../types';
import DeckQuotaOverview from '../../components/profile/DeckQuotaOverview';
import DeckGenerationActivity from '../../components/profile/DeckGenerationActivity';
import RegenerationPacks from '../../components/regeneration/RegenerationPacks';
import CreditTransactionHistory from '../../components/profile/CreditTransactionHistory';

interface ProfileFormData {
  username: string;
  email: string;
  bio: string;
  isCreator: boolean;
  isReader: boolean;
}

const Profile = () => {
  const { user, checkAuth } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deckStats, setDeckStats] = useState({ created: 0, purchased: 0 });
  
  const { 
    register, 
    handleSubmit,
    reset,
    formState: { errors } 
  } = useForm<ProfileFormData>();
  
  // Load user profile data
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        setSaveError(null);
        
        // Fetch profile data
        const profile = await getUserProfile(user.id);
        
        if (profile) {
          setProfileData(profile);
          
          // Set form defaults
          reset({
            username: profile.username || '',
            email: profile.email || '',
            bio: profile.bio || '',
            isCreator: profile.is_creator || false,
            isReader: profile.is_reader || false,
          });
        }
        
        // Fetch deck stats
        const { data: createdDecks, error: createdError } = await supabase
          .from('decks')
          .select('id', { count: 'exact' })
          .eq('creator_id', user.id);
          
        if (!createdError) {
          setDeckStats(prev => ({ ...prev, created: createdDecks?.length || 0 }));
        }
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user?.id, reset]);
  
  // Handle form submission
  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return;
    
    try {
      setSaving(true);
      setSaveError(null);
      
      // Prepare data for update
      const updateData: Partial<User> = {
        username: data.username,
        // Don't update email as it's managed by Auth
        bio: data.bio,
        is_creator: data.isCreator,
        is_reader: data.isReader
      };
      
      // Update profile in Supabase
      const { success, error } = await updateUserProfile(user.id, updateData);
      
      if (!success) {
        throw new Error(error || 'Failed to update profile');
      }
      
      // Update local state
      setProfileData(prev => prev ? { ...prev, ...updateData } : null);
      
      // Show success message
      setSaveSuccess(true);
      setIsEditing(false);
      
      // Refresh auth context
      await checkAuth();
      
      // Reset success message after delay
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setSaveError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle profile image update
  const handleProfileImageUpdate = (newImageUrl: string) => {
    // Update local state
    setProfileData(prev => prev ? { ...prev, avatar_url: newImageUrl } : null);
    
    // Refresh auth context to reflect changes
    checkAuth();
  };
  
  if (loading && !profileData) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif font-bold mb-8 mt-8">Your Profile</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left Column - Profile Sidebar */}
            <div className="md:col-span-1">
              <motion.div 
                className="bg-card rounded-xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {/* Profile Image with Upload */}
                <div className="p-8 flex justify-center">
                  <ProfileImageUpload 
                    user={profileData || user || { id: '', email: '' }}
                    onUpdate={handleProfileImageUpdate}
                  />
                </div>
                
                <div className="p-4">
                  <h2 className="font-serif font-bold text-xl text-center">
                    {profileData?.username || user?.username || user?.email?.split('@')[0] || 'User'}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1 text-center">
                    Member since {new Date(user?.created_at || '').toLocaleDateString()}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-2xl font-bold">{deckStats.created}</p>
                        <p className="text-sm text-muted-foreground">Created</p>
                      </div>
                      <div className="p-3 bg-muted/10 rounded-lg">
                        <p className="text-2xl font-bold">{deckStats.purchased}</p>
                        <p className="text-sm text-muted-foreground">Purchased</p>
                      </div>
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full btn btn-primary mt-6 py-2"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              </motion.div>
              
              {/* Credit Summary Card */}
              <div className="mt-6">
                <DeckQuotaOverview />
              </div>
              
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
                  
                  <div className="p-4 bg-muted/10 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Your account is secured using:
                    </p>
                    <div className="flex items-center space-x-2 mb-1">
                      <Mail className="h-4 w-4 text-accent" />
                      <p className="text-sm">{user?.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sign in with magic link or Google
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Right Column - Profile Details & Transaction History */}
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Profile Details */}
              <div className="bg-card rounded-xl border border-border p-6">
                {saveSuccess && (
                  <div className="mb-6 p-4 border border-success/30 bg-success/10 rounded-lg flex items-start gap-3">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <p className="text-sm text-success">Your profile has been updated successfully.</p>
                  </div>
                )}
                
                {saveError && (
                  <div className="mb-6 p-4 border border-destructive/30 bg-destructive/10 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{saveError}</p>
                  </div>
                )}
                
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
                        disabled={true} // Always disabled as email is managed by Auth
                        className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed"
                        {...register('email')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed directly. It's connected to your authentication method.
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
                      <h3 className="text-lg font-medium">Preferences</h3>
                      
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
              
              {/* Credit Transaction History */}
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <DeckGenerationActivity />
              </motion.div>
              
              {/* Regeneration Packs */}
              <motion.div
                className="mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <RegenerationPacks />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;