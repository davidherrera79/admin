(function (global) {
  const INVENTORY_KEY = 'studioPlayInventario';
  const CONFLICT_PARAM = 'inventory-origin-conflict';
  const loopbackHosts = ['127.0.0.1', '[::1]', '::1'];

  function showWarning(message) {
    function render() {
      const notice = document.createElement('div');
      notice.className = 'alert alert-warning m-3';
      notice.setAttribute('role', 'alert');
      notice.textContent = message;
      document.body.prepend(notice);
    }

    if (document.body) {
      render();
    } else {
      document.addEventListener('DOMContentLoaded', render, { once: true });
    }
  }

  const currentUrl = new URL(global.location.href);
  if (currentUrl.hostname === 'localhost') {
    if (currentUrl.searchParams.has(CONFLICT_PARAM)) {
      currentUrl.searchParams.delete(CONFLICT_PARAM);
      global.history.replaceState(null, '', currentUrl.href);
      showWarning('Se encontró otro inventario guardado en una dirección distinta. Se conservó el inventario de localhost para evitar sobrescribir movimientos.');
    }
    return;
  }

  if (loopbackHosts.indexOf(currentUrl.hostname) === -1) return;

  let inventory;
  try {
    inventory = global.localStorage.getItem(INVENTORY_KEY);
  } catch (error) {
    global.console.error('No se pudo leer el inventario antes de unificar el origen.', error);
    showWarning('No se pudo unificar el origen del inventario. No registres movimientos en esta pestaña; abre la aplicación desde localhost.');
    return;
  }

  const canonicalUrl = new URL(currentUrl.href);
  canonicalUrl.hostname = 'localhost';
  const bridgeUrl = new URL('../components/inventory-origin-bridge.html', canonicalUrl);
  bridgeUrl.hash = new URLSearchParams({
    transfer: JSON.stringify({
      sourceOrigin: currentUrl.origin,
      returnUrl: canonicalUrl.href,
      inventory: inventory
    })
  }).toString();
  global.location.replace(bridgeUrl.href);
})(window);
