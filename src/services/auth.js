// auth/googleClient.js
let codeClient;

export function initGoogle(clientId) {
  /* global google */
  codeClient = google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: 'openid email profile',
    ux_mode: 'popup',               // or 'redirect'
    redirect_uri: window.location.origin + '/auth/callback', // if ux_mode:'redirect'
    callback: async (resp) => {
      // resp has { code } on success
      if (resp.code) {
        const r = await fetch('/api/auth/google/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code: resp.code })
        });
        if (!r.ok) { /* show error */ }
        // you’re now logged in (server set a session cookie)
        window.location.href = '/dashboard';
      }
    },
  });
}

export function signInWithGoogle() {
  codeClient.requestCode(); // opens popup, returns code to callback
}
