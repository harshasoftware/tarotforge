import { supabase } from './supabase';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get a file extension from file object
const getFileExtension = (file: File): string => {
  return file.name.split('.').pop()?.toLowerCase() || 'jpg';
};

// Helper function to validate image file
export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!validTypes.includes(file.type)) {
    console.error('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
    return false;
  }
  
  if (file.size > maxSize) {
    console.error('File too large. Please select an image less than 5MB.');
    return false;
  }
  
  return true;
};

// Upload a profile image to Supabase Storage and return the URL
export const uploadProfileImage = async (
  file: File | Blob,
  userId: string
): Promise<string | null> => {
  try {
    // Validate file
    if (file instanceof File && !validateImageFile(file)) {
      throw new Error('Invalid image file');
    }
    
    // Generate a unique file name
    const fileExt = file instanceof File ? getFileExtension(file) : 'jpg';
    const fileName = `${userId}/profile-${uuidv4()}.${fileExt}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    return null;
  }
};

// Save profile image URL to user's profile
export const updateUserProfileImage = async (
  userId: string,
  imageUrl: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: imageUrl })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile image URL:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserProfileImage:', error);
    return false;
  }
};

// Update user profile data
export const updateUserProfile = async (
  userId: string,
  profileData: Partial<User>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Make sure we can't update id or created_at
    const { id, created_at, ...validData } = profileData as any;
    
    const { data, error } = await supabase
      .from('users')
      .update(validData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateUserProfile:', error);
    return { success: false, error: error.message };
  }
};

// Fetches the user's profile data
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
    
    return data as User;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

// Fetch and process Google profile image
export const processGoogleProfileImage = async (
  userId: string,
  profileImageUrl: string
): Promise<string | null> => {
  try {
    // Fetch the image from the URL
    const response = await fetch(profileImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Google profile image: ${response.statusText}`);
    }
    
    // Convert the image to a blob
    const imageBlob = await response.blob();
    
    // Upload the image to Supabase Storage
    const uploadedImageUrl = await uploadProfileImage(imageBlob, userId);
    
    if (uploadedImageUrl) {
      // Update the user's profile with the new image URL
      const updated = await updateUserProfileImage(userId, uploadedImageUrl);
      if (updated) {
        return uploadedImageUrl;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error processing Google profile image:', error);
    return null;
  }
};