class GoogleAuthManager {
  constructor(clientID) {
    this.clientID = clientID;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.isSignedIn = false;
    this.onStateChange = null;
    this._tokenClient = null;
    this._pendingResolve = null;
  }

  init() {
    if (this._tokenClient) return;
    this._tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: this.clientID,
      scope: 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive',
      callback: (response) => {
        if (response.error) {
          this._pendingResolve?.(null);
          this._pendingResolve = null;
          return;
        }
        this.accessToken = response.access_token;
        // Subtract 60s to refresh before actual expiry
        this.tokenExpiry = Date.now() + (response.expires_in - 60) * 1000;
        this.isSignedIn = true;
        this.onStateChange?.(true);
        this._pendingResolve?.(this.accessToken);
        this._pendingResolve = null;
      },
    });
  }

  signIn() {
    this.init();
    return new Promise((resolve) => {
      this._pendingResolve = resolve;
      // prompt: '' silently reuses an existing Google session in the browser
      this._tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  signOut() {
    if (this.accessToken) google.accounts.oauth2.revoke(this.accessToken);
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.isSignedIn = false;
    this.onStateChange?.(false);
  }

  async freshAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) return this.accessToken;
    return this.signIn();
  }
}
