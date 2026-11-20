(function (global) {
  const storageKey = 'studioPlayUsers';

  // Catálogo de roles disponibles (único lugar donde se definen)
  const roleCatalog = [
    { value: 'Super Admin', icon: 'bi-shield-lock', color: 'dark' },
    { value: 'Inventario', icon: 'bi-box-seam', color: 'primary' },
    { value: 'Soporte', icon: 'bi-headset', color: 'success' },
    { value: 'Operador', icon: 'bi-camera-reels', color: 'secondary' }
  ];

  const defaultUsers = [
    {
      id: 'USR-001',
      nombre: 'Carlos',
      apellido: 'Mendoza',
      email: 'carlos.mendoza@studioplay.com',
      roles: ['Super Admin'],
      activo: true
    },
    {
      id: 'USR-002',
      nombre: 'Elena',
      apellido: 'Rojas',
      email: 'elena.rojas@studioplay.com',
      roles: ['Inventario'],
      activo: true
    },
    {
      id: 'USR-003',
      nombre: 'Marco',
      apellido: 'Díaz',
      email: 'marco.diaz@studioplay.com',
      roles: ['Soporte'],
      activo: false
    }
  ];

  function normalizeUser(user) {
    return Object.assign({ activo: true }, user, {
      roles: Array.isArray(user.roles) ? user.roles : (user.roles ? [user.roles] : [])
    });
  }

  function getUsers() {
    const storedUsers = global.localStorage.getItem(storageKey);
    if (!storedUsers) {
      saveUsers(defaultUsers);
      return defaultUsers.map(normalizeUser);
    }

    let users;
    try {
      users = JSON.parse(storedUsers);
    } catch (error) {
      throw new Error('No se pudieron leer los usuarios guardados. Verifica los datos del navegador.');
    }

    if (!Array.isArray(users)) {
      throw new Error('Los datos guardados de usuarios tienen un formato inválido.');
    }

    return users.map(normalizeUser);
  }

  function saveUsers(users) {
    global.localStorage.setItem(storageKey, JSON.stringify(users));
    if (global.parent && global.parent !== global) {
      global.parent.postMessage({ type: 'studio-users-updated' }, '*');
    }
  }

  function getNextId(users) {
    const highestId = users.reduce((highest, user) => {
      const match = /^USR-(\d+)$/.exec(user.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);

    return `USR-${String(highestId + 1).padStart(3, '0')}`;
  }

  function isSuperAdmin(user) {
    return Array.isArray(user.roles) && user.roles.includes('Super Admin');
  }

  function isActive(user) {
    return user.activo !== false;
  }

  /**
   * Comprueba que después de aplicar un cambio siga existiendo al menos
   * un Super Admin activo. Devuelve un mensaje de error o null.
   */
  function validateAdminGuard(nextUsers) {
    const activeAdmins = nextUsers.filter(u => isSuperAdmin(u) && isActive(u)).length;
    if (activeAdmins === 0) {
      return 'Debe existir al menos un Super Admin activo. Asigna el rol a otro usuario antes de continuar.';
    }
    return null;
  }

  /* ---------- Contraseñas ----------
   * Nunca se guarda la contraseña en texto plano: se deriva un hash con
   * PBKDF2 (SHA-256, 100 000 iteraciones) y una sal aleatoria por usuario.
   */
  const PBKDF2_ITERATIONS = 100000;

  function toHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  }

  function fromHex(hex) {
    const pares = String(hex).match(/[0-9a-f]{2}/gi) || [];
    return new Uint8Array(pares.map(h => parseInt(h, 16)));
  }

  async function derivar(password, salt) {
    const subtle = global.crypto && global.crypto.subtle;
    if (!subtle) {
      throw new Error('Este navegador no permite cifrar la contraseña. Abre la página desde un archivo local, http://localhost o https.');
    }
    const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      key,
      256
    );
    return toHex(new Uint8Array(bits));
  }

  async function hashPassword(password) {
    const salt = global.crypto.getRandomValues(new Uint8Array(16));
    return {
      passwordHash: await derivar(password, salt),
      passwordSalt: toHex(salt),
      passwordUpdatedAt: new Date().toISOString()
    };
  }

  function hasPassword(user) {
    return typeof user.passwordHash === 'string' && user.passwordHash.length > 0;
  }

  async function verifyPassword(user, password) {
    if (!hasPassword(user) || typeof user.passwordSalt !== 'string') return false;
    const hash = await derivar(password, fromHex(user.passwordSalt));
    return hash === user.passwordHash;
  }

  /**
   * Comprueba email + contraseña contra los usuarios registrados.
   * Devuelve { ok: true, user } o { ok: false, error }.
   */
  async function authenticate(email, password) {
    const correo = String(email || '').trim().toLowerCase();
    const user = getUsers().find(u => String(u.email || '').toLowerCase() === correo);
    const credencialesInvalidas = { ok: false, error: 'Correo o contraseña incorrectos.' };

    if (!user) return credencialesInvalidas;
    if (!hasPassword(user)) {
      return { ok: false, error: 'Este usuario aún no tiene contraseña. Asígnala editándolo en Administración de usuarios.' };
    }
    if (!(await verifyPassword(user, password))) return credencialesInvalidas;
    if (!isActive(user)) return { ok: false, error: 'Este usuario está desactivado. Pide a un administrador que lo active.' };
    return { ok: true, user: user };
  }

  function getInitials(user) {
    const a = (user.nombre || '').trim().charAt(0);
    const b = (user.apellido || '').trim().charAt(0);
    return (a + b).toUpperCase() || '?';
  }

  global.StudioUserStore = {
    roleCatalog: roleCatalog,
    getUsers: getUsers,
    saveUsers: saveUsers,
    getNextId: getNextId,
    isSuperAdmin: isSuperAdmin,
    isActive: isActive,
    validateAdminGuard: validateAdminGuard,
    hashPassword: hashPassword,
    hasPassword: hasPassword,
    authenticate: authenticate,
    getInitials: getInitials
  };
})(window);
