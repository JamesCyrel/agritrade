import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Complete the auth session for web
WebBrowser.maybeCompleteAuthSession();

const getRedirectUrl = () => {
  const scheme = Constants.expoConfig?.scheme || 'mobile';
  const appOwnership = Constants.appOwnership;

  let redirect;
  if (appOwnership === 'expo') {
    const owner =
      Constants.expoConfig?.owner ||
      Constants.easConfig?.owner ||
      Constants.manifest2?.extra?.expoClient?.owner ||
      Constants.manifest?.owner;
    const slug = Constants.expoConfig?.slug || Constants.manifest2?.extra?.expoClient?.slug || 'mobile';
    if (owner) {
      redirect = `https://auth.expo.io/@${owner}/${slug}`;
    } else {
      redirect = AuthSession.makeRedirectUri({ useProxy: true });
    }
  } else {
    redirect = AuthSession.makeRedirectUri({ scheme, preferLocalhost: true, isTripleSlashed: true });
  }

  console.log('Expo Google redirect →', redirect);
  return redirect;
};

export const signInWithGoogle = async () => {
  try {
    // Get the OAuth URL from Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    const redirectUrl = getRedirectUrl();
    // Open the OAuth URL in a browser
    let result;
    try {
      if (typeof AuthSession.startAsync === 'function') {
        result = await AuthSession.startAsync({
          authUrl: data.url,
          returnUrl: redirectUrl,
        });
      } else {
        result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            createTask: false,
            showInRecents: true,
          }
        );
      }
    } catch (browserError) {
      console.error('openAuthSessionAsync threw:', browserError);
      throw browserError;
    }
    console.log('Google OAuth result:', result);

    if (result.type === 'success') {
      // Extract the URL from the result
      const url = result.url;
      
      // Parse the URL to get the code and other parameters
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      
      if (code) {
        // Exchange the code for a session
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          console.error('Supabase exchangeCodeForSession error:', sessionError);
          throw sessionError;
        }

        if (sessionData?.session) {
          return {
            success: true,
            session: sessionData.session,
            user: sessionData.user,
          };
        }
      }
    }

    throw new Error('Authentication was cancelled or failed');
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

// Alternative method using Supabase's built-in OAuth flow
export const signInWithGoogleAlternative = async () => {
  try {
    const redirectUrl = getRedirectUrl();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      throw new Error('No OAuth URL returned from Supabase');
    }

    // Open the OAuth URL in a browser and wait for the callback
    let result;
    try {
      if (Constants.appOwnership === 'expo') {
        if (typeof AuthSession.startAsync === 'function') {
          result = await AuthSession.startAsync({
            authUrl: data.url,
            returnUrl: redirectUrl,
          });
        } else {
          result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl,
            {
              createTask: false,
              showInRecents: true,
            }
          );
        }
      } else {
        result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            createTask: false,
            showInRecents: true,
          }
        );
      }
    } catch (browserError) {
      console.error('openAuthSessionAsync threw (alt):', browserError);
      throw browserError;
    }
    console.log('Google OAuth result (alt):', result);

    if (result.type === 'success') {
      // Parse the callback URL
      const url = result.url;
      
      // Extract the code from the URL
      // Supabase redirects with: scheme://#access_token=...&refresh_token=...&expires_in=...
      // or: scheme://?code=...
      let code = null;
      let accessToken = null;
      let refreshToken = null;

      try {
        const parsedUrl = new URL(url);
        // Check for code in query params
        code = parsedUrl.searchParams.get('code');
        
        // Check for hash params (fragment)
        if (parsedUrl.hash) {
          const hashParams = new URLSearchParams(parsedUrl.hash.substring(1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
      } catch (e) {
        // If URL parsing fails, try to extract from the URL string directly
        const codeMatch = url.match(/[?&#]code=([^&]+)/);
        if (codeMatch) {
          code = decodeURIComponent(codeMatch[1]);
        }
        const accessTokenMatch = url.match(/[?&#]access_token=([^&]+)/);
        if (accessTokenMatch) {
          accessToken = decodeURIComponent(accessTokenMatch[1]);
        }
        const refreshTokenMatch = url.match(/[?&#]refresh_token=([^&]+)/);
        if (refreshTokenMatch) {
          refreshToken = decodeURIComponent(refreshTokenMatch[1]);
        }
      }

      // If we have tokens directly, use them
      if (accessToken && refreshToken) {
        // Get user info with the access token
        const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
        
        if (userError) {
          console.error('Supabase getUser error:', userError);
          throw userError;
        }

        return {
          success: true,
          session: {
            access_token: accessToken,
            refresh_token: refreshToken,
          },
          user: userData.user,
        };
      }

      // Otherwise, exchange code for session
      if (code) {
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          console.error('Supabase exchangeCodeForSession error (alt):', sessionError);
          throw sessionError;
        }

        if (sessionData?.session && sessionData?.user) {
          return {
            success: true,
            session: sessionData.session,
            user: sessionData.user,
          };
        }
      }

      throw new Error('Could not extract authentication tokens from callback');
    }

    return {
      success: false,
      error: 'Authentication was cancelled',
    };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

