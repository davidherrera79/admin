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
    getInitials: getInitials
  };
})(window);
