// Nur fuer UI-Tests; Anmeldetests pruefen den echten Ablauf selbst.
module.exports = async function cmsAngemeldet(page) {
  await page.addInitScript(() => localStorage.setItem('cms_auth_token', 'test-cms-session'));
  await page.route('**/api/cms-auth', (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    const authenticated = route.request().headers()['x-cms-auth'] === 'test-cms-session';
    return route.fulfill({ status: authenticated ? 200 : 401, json: { authenticated } });
  });
};
