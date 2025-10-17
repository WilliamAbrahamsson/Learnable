export function waitForGoogleScript(timeoutMs = 8000): Promise<typeof window.google> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (window.google && window.google.accounts) {
        resolve(window.google);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('Google Identity Services failed to load'));
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}

export function initGoogleId(clientId: string, callback: (credential: string) => void) {
  if (!window.google?.accounts?.id) return;
  // Safe to call multiple times; GIS will reuse the same config
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (resp: any) => {
      const cred = resp?.credential as string | undefined;
      if (cred) callback(cred);
    },
    ux_mode: 'popup',
  });
}

export function renderGoogleButton(container: HTMLElement, theme: 'outline' | 'filled_blue' = 'filled_blue') {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.renderButton(container, {
    theme,
    size: 'large',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: 320,
    text: 'continue_with',
  });
}

