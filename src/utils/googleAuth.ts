export interface GoogleUserData {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

export const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '522892535047-12omaqardjr7a24dt86sfloju8vcsm3k.apps.googleusercontent.com';

/**
 * Triggers Google Sign-In popup using Google Identity Services (GIS).
 * Opens the account chooser popup (identical to Shopee).
 */
export const signInWithGooglePopup = (): Promise<GoogleUserData> => {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK chưa sẵn sàng. Vui lòng thử lại sau giây lát.'));
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            if (tokenResponse.error === 'popup_closed_by_user') {
              reject(new Error('popup_closed'));
              return;
            }
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }

          try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            if (!res.ok) {
              throw new Error('Không thể lấy thông tin tài khoản từ Google');
            }
            const data = await res.json();
            resolve({
              email: (data.email || '').toLowerCase().trim(),
              name: data.name || data.given_name || 'OwlUp User',
              picture: data.picture,
              sub: data.sub,
            });
          } catch (err) {
            reject(err);
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
};
