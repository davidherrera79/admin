(function (global) {
  const navbarFrame = document.getElementById('navbarFrame');
  const sidebarFrame = document.getElementById('sidebarFrame');
  if (!navbarFrame || !sidebarFrame) return;

  const destinations = {
    todos: './dashboard.html#todos',
    'config-password': './dashboard.html#config-password',
    'config-email': './dashboard.html#config-email',
    'usuario-admin': './useradmin.html',
    'usuario-restar': './restar.html',
    'inventario-productos': './productos.html',
    'inventario-entrada': './entrada.html',
    'inventario-salida': './salida.html'
  };

  global.addEventListener('message', function (event) {
    if (event.source === navbarFrame.contentWindow) {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'navbar-dropdown') {
        navbarFrame.classList.toggle('dropdown-open', Boolean(event.data.open));
      } else if (event.data.type === 'navbar-login-request') {
        global.location.href = './dashboard.html';
      }
      return;
    }

    if (event.source !== sidebarFrame.contentWindow || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'sidebar-state') {
      sidebarFrame.classList.toggle('pinned', Boolean(event.data.pinned));
      sidebarFrame.classList.toggle('peek', Boolean(event.data.peek));
    } else if (event.data.type === 'navigate-section') {
      const destination = destinations[event.data.section];
      if (destination) global.location.href = destination;
    }
  });
})(window);
