import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { User, Mail, Lock, Upload, Check, Save, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ProfileFormData {
  username: string;
  email: string;
  bio: string;
  isCreator: boolean;
  isReader: boolean;
}

const Profile = () => {
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<ProfileFormData>({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      bio: '',
      isCreator: user?.is_creator || false,
      isReader: user?.is_reader || false,
    }
  });
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      
      // In a real app, this would update the Supabase profile
      console.log('Updating profile:', data);
      
      // Simulate API delay
      setTimeout(() => {
        setSaving(false);
        setSaveSuccess(true);
        setIsEditing(false);
        
        // Reset success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setSaving(false);
    }
  };
  
  return (
    <div className="min-h-screen pt-12 pb-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-serif font-bold mb-8 mt-8">Your Profile</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Profile Sidebar */}
            <div className="md:col-span-1">
              <motion.div 
                className="bg-card rounded-xl border border-border overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="aspect-square bg-primary/20 relative flex items-center justify-center">
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-24 w-24 text-muted-foreground" />
                  )}
                  {isEditing && (
                    <button className="absolute bottom-3 right-3 bg-primary text-primary-foreground p-2 rounded-full">
                      <Upload className="h-5 w-5" />
                    </button>
                  )}
                </div>
                
                <div className="p-4">
                  <h2 className="font-serif font-bold text-xl">{user?.username || 'User'}</h2>
                  <p className="text-muted-foreground text-sm mt-1">Member since {new Date(user?.created_at || '').toLocaleDateString()}</p>
                  
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold">{mockCreatedDecks.length}</p>
                        <p className="text-sm text-muted-foreground">Created</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{mockOwnedDecks.length}</p>
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
                  
                  <button className="w-full btn btn-secondary py-2 mb-3 flex items-center justify-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Change Email
                  </button>
                  
                  <button className="w-full btn btn-secondary py-2 flex items-center justify-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </button>
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
                {saveSuccess && (
                  <div className="mb-6 p-4 border border-success/30 bg-success/10 rounded-lg flex items-start gap-3">
                    <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <p className="text-sm text-success">Your profile has been updated successfully.</p>
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
                        disabled={!isEditing}
                        className={`w-full p-2 rounded-md border ${
                          errors.email ? 'border-destructive' : 'border-input'
                        } bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed`}
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                      )}
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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock data for profile page
const mockOwnedDecks = [1, 2];
const mockCreatedDecks = [1];

export default Profile;