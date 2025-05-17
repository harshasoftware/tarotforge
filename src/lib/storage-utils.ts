import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Get environment variables for S3 storage configuration
const S3_STORAGE_URL = import.meta.env.VITE_SUPABASE_S3_STORAGE || '';
const S3_REGION = import.meta.env.VITE_SUPABASE_S3_STORAGE_REGION || '';

// Log configuration status
if (!S3_STORAGE_URL || !S3_REGION) {
  console.warn('S3 storage configuration incomplete. Using default Supabase storage.');
}

// Note: Authentication is handled by the Supabase client which includes the user's JWT token
// This follows the Session Token authentication method from the Supabase S3 documentation

/**
 * Uploads an image from a URL to Supabase Storage
 * @param imageUrl The external image URL to upload
 * @param deckId The deck ID to organize storage
 * @param cardName The name of the card for the file name
 * @returns The URL of the uploaded image in Supabase Storage
 */
export const uploadImageFromUrl = async (
  imageUrl: string,
  deckId: string,
  cardName: string
): Promise<string> => {
  try {
    // Fetch the image from the URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
    }
    
    // Convert the image to a blob
    const blob = await response.blob();
    
    // Create a clean file name
    const cleanCardName = cardName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const fileName = `${cleanCardName}-${uuidv4()}.${getFileExtension(blob.type)}`;
    const filePath = `${deckId}/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('card-images')
      .upload(filePath, blob, {
        contentType: blob.type,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image to Supabase Storage:', error);
      return imageUrl; // Fallback to original URL on error
    }
    
    // Get public URL for the uploaded file using Supabase's built-in methods
    // This automatically handles authentication and proper URL formatting whether using S3 or not
    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(data.path);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadImageFromUrl:', error);
    return imageUrl; // Fallback to original URL on error
  }
};

/**
 * Gets a file extension from a MIME type
 * @param mimeType The MIME type of the file
 * @returns The file extension
 */
function getFileExtension(mimeType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  };
  
  return extensions[mimeType] || 'jpg';
}

/**
 * Retrieves an image from Supabase Storage
 * @param deckId The deck ID
 * @param cardId The card ID
 * @returns The URL of the image in Supabase Storage
 */
export const getCardImageUrl = async (
  deckId: string,
  cardId: string
): Promise<string | null> => {
  try {
    // List files in the deck directory
    const { data, error } = await supabase.storage
      .from('card-images')
      .list(deckId);
    
    if (error) {
      console.error('Error listing files in Supabase Storage:', error);
      return null;
    }
    
    // Find file containing the cardId
    const file = data.find(item => item.name.includes(cardId));
    if (!file) {
      return null;
    }
    
    // Get URL for the file using Supabase's built-in methods
    // This automatically handles authentication and proper URL formatting
    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(`${deckId}/${file.name}`);
    
    return publicUrl;
  } catch (error) {
    console.error('Error in getCardImageUrl:', error);
    return null;
  }
};

/**
 * Deletes all images for a deck from storage
 * @param deckId The deck ID
 */
export const deleteDeckImages = async (deckId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.storage
      .from('card-images')
      .list(deckId);
    
    if (error) {
      console.error('Error listing files for deletion:', error);
      return;
    }
    
    if (data.length > 0) {
      const filePaths = data.map(file => `${deckId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('card-images')
        .remove(filePaths);
        
      if (deleteError) {
        console.error('Error deleting files from storage:', deleteError);
      }
    }
  } catch (error) {
    console.error('Error in deleteDeckImages:', error);
  }
};