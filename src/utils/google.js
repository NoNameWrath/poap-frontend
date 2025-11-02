// src/utils/google.js
export function waitForGoogle() {
  return new Promise((resolve) => {
    if (window.google?.accounts) return resolve(window.google);
    const id = setInterval(() => {
      if (window.google?.accounts) {
        clearInterval(id);
        resolve(window.google);
      }
    }, 50);
  });
}

export async function createCodeClient({ clientId, redirectUri, callback }) {
  const google = await waitForGoogle();
  const codeClient = google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: 'openid email profile',
    ux_mode: 'popup', // switch to 'redirect' if you prefer
    redirect_uri: redirectUri, // used only when ux_mode is 'redirect'
    callback, // receives { code } on success
  });
  return codeClient;
}
