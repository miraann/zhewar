// Navigate instead of fetch so the cookie is sent with the request
// (Capacitor WebView doesn't send cookies in JS fetch() calls).
// The GET handler on /api/admin/logout clears the cookie and redirects.
export function adminLogout() {
  localStorage.removeItem('admin_token');
  window.location.href = '/api/admin/logout';
}
