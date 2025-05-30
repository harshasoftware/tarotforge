import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { useAuthStore } from '../../stores/authStore';
import { AlertCircle } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('Initializing authentication...');
  const [loading, setLoading] = useState(false);
  
  // Handle auth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setLoading(true);
        const { handleGoogleRedirect } = useAuthStore.getState();
        const result = await handleGoogleRedirect();
        
        if (result.error) {
          console.error('Auth callback error:', result.error);
          setError('Authentication failed. Please try again.');
          return;
        }
        
        // Check for pending migration from anonymous user
        const pendingMigration = localStorage.getItem('pending_migration');
        if (pendingMigration) {
          try {
            const { fromUserId, email } = JSON.parse(pendingMigration);
            const { user } = useAuthStore.getState();
            
            if (user && user.email === email) {
              console.log('🔄 Performing pending data migration');
              const { migrateAnonymousUserData } = useAuthStore.getState();
              await migrateAnonymousUserData(fromUserId, user.id);
              
              localStorage.removeItem('pending_migration');
              console.log('✅ Data migration completed successfully');
            }
          } catch (migrationError) {
            console.error('❌ Error during data migration:', migrationError);
            // Don't block the auth flow even if migration fails
          }
        }
        
        // Check if this is an anonymous user who just linked with Google
        const { user } = useAuthStore.getState();
        const pendingGoogleLink = localStorage.getItem('pending_google_link');
        
        console.log('🔍 Checking Google link status:', {
          pendingGoogleLink: !!pendingGoogleLink,
          userExists: !!user,
          userEmail: user?.email,
          userId: user?.id
        });
        
        if (pendingGoogleLink && user) {
          try {
            const anonymousUserId = pendingGoogleLink;
            console.log('🔗 Completing Google link for anonymous user:', anonymousUserId);
            console.log('🔍 Current user after OAuth:', user);
            
            setProcessingStep('Creating your account...');
            
            // Get the actual session to check if we have updated user info
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('❌ Error getting session:', sessionError);
              throw sessionError;
            }
            
            console.log('🔍 Session user info:', {
              email: session?.user?.email,
              userMetadata: session?.user?.user_metadata,
              identities: session?.user?.identities?.length
            });
            
            const userEmail = session?.user?.email || user.email;
            const userMetadata = session?.user?.user_metadata || {};
            
            if (!userEmail) {
              console.error('❌ No email found after Google linking');
              throw new Error('Google linking failed - no email found');
            }
            
            // Create user profile in users table (transition from anonymous_users)
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id, // Same ID as auth user
                email: userEmail,
                username: userMetadata.preferred_username || userEmail.split('@')[0],
                full_name: userMetadata.full_name || userMetadata.name || `User ${userEmail.split('@')[0]}`,
                avatar_url: userMetadata.avatar_url || userMetadata.picture,
                created_at: new Date().toISOString()
              });
              
            if (insertError) {
              console.warn('Could not create user profile:', insertError);
            } else {
              console.log('✅ Created user profile successfully');
            }
            
            // Migrate anonymous user data (reading sessions, decks, etc.)
            setProcessingStep('Migrating your reading sessions...');
            try {
              const { migrateAnonymousUserData } = useAuthStore.getState();
              await migrateAnonymousUserData(anonymousUserId, user.id);
              console.log('✅ Anonymous user data migrated successfully');
            } catch (migrationError) {
              console.error('❌ Error migrating anonymous user data:', migrationError);
              // Don't block the auth flow even if migration fails
            }
            
            // Clean up anonymous user record
            const { error: cleanupError } = await supabase
              .from('anonymous_users')
              .delete()
              .eq('id', anonymousUserId);
              
            if (cleanupError) {
              console.warn('Could not clean up anonymous user record:', cleanupError);
            } else {
              console.log('✅ Cleaned up anonymous user record');
            }
            
            localStorage.removeItem('pending_google_link');
            console.log('✅ Google linking completed successfully');
            setProcessingStep('Account setup complete! Redirecting...');
          } catch (linkError) {
            console.error('❌ Error completing Google link:', linkError);
            // Don't block the auth flow even if linking completion fails
          }
        }
        
        // Get the return path
        const returnPath = localStorage.getItem('auth_return_path');
        if (returnPath) {
          localStorage.removeItem('auth_return_path');
          navigate(returnPath);
        } else {
          // Default redirect based on user type
          if (user?.is_creator) {
            navigate('/create-deck');
          } else {
            navigate('/');
          }
        }
      } catch (error) {
        console.error('Callback error:', error);
        setError('Authentication failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-serif mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <p className="text-sm text-muted-foreground">Redirecting you to login...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoadingScreen />
      <div className="mt-8 max-w-md text-center">
        <h2 className="text-xl font-medium mb-2">Setting Up Your Account</h2>
        <p className="text-muted-foreground mb-4">{processingStep}</p>
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
          <div className="h-2 bg-primary rounded-full animate-pulse" style={{ width: '75%' }}></div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;