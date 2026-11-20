/*
 * Sesión compartida entre páginas (dashboard, useradmin y el componente navbar).
 * El inicio de sesión se valida con StudioUserStore.authenticate (email + contraseña);
 * aquí solo se recuerda quién inició sesión.
 *
 * Además de localStorage, la sesión se envía entre la página y el navbar por
 * postMessage, porque algunos navegadores (p. ej. Firefox con archivos locales)
 * no comparten el almacenamiento entre carpetas distintas.
 */
(function (global) {
  const KEY = 'studioPlaySession';
  const VERSION = 2; // las sesiones de versiones anteriores (sin validar contraseña) se descartan

  const SESION_CERRADA = { loggedIn: false, email: '', nombre: '' };

  function normalize(data) {
    if (!data || typeof data !== 'object' || data.v !== VERSION || data.loggedIn !== true) {
      return Object.assign({}, SESION_CERRADA);
    }
    return {
      loggedIn: true,
      email: typeof data.email === 'string' ? data.email : '',
      nombre: typeof data.nombre === 'string' ? data.nombre : ''
    };
  }

  function get() {
    try {
      return normalize(JSON.parse(global.localStorage.getItem(KEY) || 'null'));
    } catch (error) {
      return Object.assign({}, SESION_CERRADA);
    }
  }

  // Guarda una sesión recibida (p. ej. por mensaje desde otro frame)
  function set(session) {
    const s = session && session.loggedIn ? Object.assign({ v: VERSION }, session) : null;
    const limpia = normalize(s);
    try {
      global.localStorage.setItem(KEY, JSON.stringify(Object.assign({ v: VERSION }, limpia)));
    } catch (error) {
      /* sin almacenamiento disponible */
    }
    return limpia;
  }

  function login(user) {
    return set({
      loggedIn: true,
      email: String(user.email || '').toLowerCase(),
      nombre: String(user.nombre || '')
    });
  }

  function logout() {
    return set(SESION_CERRADA);
  }

  function displayName(session) {
    const s = session || get();
    return s.nombre || (s.email && s.email.split('@')[0]) || 'Invitado';
  }

  global.StudioSession = {
    KEY: KEY,
    get: get,
    set: set,
    login: login,
    logout: logout,
    displayName: displayName
  };
})(window);
