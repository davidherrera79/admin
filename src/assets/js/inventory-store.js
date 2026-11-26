(function (global) {
  const KEY = 'studioPlayInventario';
  const MAX_ACTIVITY = 25;
  const ICONS_BY_CATEGORY = {
    Video: 'bi-camera-video',
    Audio: 'bi-mic',
    Luz: 'bi-lightbulb',
    Rig: 'bi-aspect-ratio'
  };
  const DEFAULT_PRODUCTS = [
    { id: 'catalog:SP-001', codigo: 'SP-001', nombre: 'Cámara Sony FX3 Cinema', corto: 'Sony FX3', categoria: 'Video', icon: 'bi-camera-video', stock: 45, entradas: 15, salidas: 6 },
    { id: 'catalog:SP-002', codigo: 'SP-002', nombre: 'Micrófono Shure SM7B', corto: 'Shure SM7B', categoria: 'Audio', icon: 'bi-mic', stock: 60, entradas: 20, salidas: 8 },
    { id: 'catalog:SP-003', codigo: 'SP-003', nombre: 'Panel LED Aputure 600d', corto: 'LED Aputure', categoria: 'Luz', icon: 'bi-lightbulb', stock: 40, entradas: 12, salidas: 5 },
    { id: 'catalog:SP-004', codigo: 'SP-004', nombre: 'Estabilizador DJI RS3 Pro', corto: 'DJI RS3', categoria: 'Rig', icon: 'bi-aspect-ratio', stock: 25, entradas: 10, salidas: 4 }
  ];

  function defaultProducts() {
    return DEFAULT_PRODUCTS.map(function (producto) {
      return Object.assign({}, producto);
    });
  }

  function countOr(value, fallback) {
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  }

  function createProductId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return 'product-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }

  function iconForCategory(category) {
    return Object.prototype.hasOwnProperty.call(ICONS_BY_CATEGORY, category)
      ? ICONS_BY_CATEGORY[category]
      : 'bi-box';
  }

  function load() {
    let data;
    try {
      data = JSON.parse(global.localStorage.getItem(KEY) || 'null');
    } catch (error) {
      global.console.error('No se pudo leer el inventario guardado.', error);
      return { productos: defaultProducts(), actividad: [], deletedProductIds: [] };
    }

    if (!data || typeof data !== 'object') {
      return { productos: defaultProducts(), actividad: [], deletedProductIds: [] };
    }

    const deletedProductIds = Array.isArray(data.productos) && Array.isArray(data.deletedProductIds)
      ? Array.from(new Set(data.deletedProductIds.filter(function (id) {
        return typeof id === 'string';
      })))
      : [];
    const deletedProductIdSet = new Set(deletedProductIds);
    const productos = defaultProducts().filter(function (producto) {
      return !deletedProductIdSet.has(producto.id);
    });
    const actividad = [];

    if (Array.isArray(data.productos)) {
      data.productos.forEach(function (saved) {
        if (!saved || typeof saved.codigo !== 'string') return;
        const savedId = typeof saved.id === 'string' && saved.id
          ? saved.id
          : null;
        if (savedId && deletedProductIdSet.has(savedId)) return;
        const savedCode = saved.codigo.trim().toUpperCase();
        const existing = productos.find(function (producto) {
          return savedId ? producto.id === savedId : producto.codigo === savedCode;
        });
        if (existing) {
          const duplicateCode = productos.some(function (producto) {
            return producto !== existing && producto.codigo === savedCode;
          });
          if (/^SP-\d{3,}$/.test(savedCode) && !duplicateCode) {
            existing.codigo = savedCode;
          } else if (existing.codigo !== savedCode) {
            global.console.error('Se ignoró un código de producto inválido o duplicado.', savedCode);
          }
          if (typeof saved.nombre === 'string' && saved.nombre.trim()) {
            existing.nombre = saved.nombre.trim().slice(0, 80);
            existing.corto = existing.nombre.slice(0, 24);
          }
          if (typeof saved.categoria === 'string'
            && saved.categoria.trim()
            && saved.categoria.trim().length <= 40) {
            existing.categoria = saved.categoria.trim();
            existing.icon = iconForCategory(existing.categoria);
          }
          if (typeof saved.registradoPor === 'string') {
            existing.registradoPor = saved.registradoPor.trim().slice(0, 160);
          }
          if (typeof saved.fechaRegistro === 'string'
            && !Number.isNaN(new Date(saved.fechaRegistro).getTime())) {
            existing.fechaRegistro = saved.fechaRegistro;
          }
          if (Number.isSafeInteger(saved.unidadesRegistro) && saved.unidadesRegistro >= 0) {
            existing.unidadesRegistro = saved.unidadesRegistro;
          }
          if (typeof saved.codigoRegistro === 'string' && /^SP-\d{3,}$/.test(saved.codigoRegistro)) {
            existing.codigoRegistro = saved.codigoRegistro;
          }
          if (typeof saved.nombreRegistro === 'string' && saved.nombreRegistro.trim()) {
            existing.nombreRegistro = saved.nombreRegistro.trim().slice(0, 80);
          }
          if (typeof saved.categoriaRegistro === 'string'
            && saved.categoriaRegistro.trim()
            && saved.categoriaRegistro.trim().length <= 40) {
            existing.categoriaRegistro = saved.categoriaRegistro.trim();
          }
          existing.stock = countOr(saved.stock, existing.stock);
          existing.entradas = countOr(saved.entradas, existing.entradas);
          existing.salidas = countOr(saved.salidas, existing.salidas);
          return;
        }

        const id = savedId || 'legacy:' + savedCode;
        if (!/^SP-\d{3,}$/.test(savedCode)
          || typeof saved.nombre !== 'string'
          || !saved.nombre.trim()
          || typeof saved.categoria !== 'string'
          || !saved.categoria.trim()
          || saved.categoria.trim().length > 40
          || productos.some(function (producto) {
            return producto.codigo === savedCode || producto.id === id;
          })) {
          return;
        }

        productos.push({
          id: id,
          codigo: savedCode,
          nombre: saved.nombre.trim().slice(0, 80),
          corto: saved.nombre.trim().slice(0, 24),
          categoria: saved.categoria.trim(),
          icon: iconForCategory(saved.categoria.trim()),
          registradoPor: typeof saved.registradoPor === 'string' ? saved.registradoPor.trim().slice(0, 160) : '',
          fechaRegistro: typeof saved.fechaRegistro === 'string'
            && !Number.isNaN(new Date(saved.fechaRegistro).getTime())
            ? saved.fechaRegistro
            : '',
          unidadesRegistro: Number.isSafeInteger(saved.unidadesRegistro) && saved.unidadesRegistro >= 0
            ? saved.unidadesRegistro
            : null,
          codigoRegistro: typeof saved.codigoRegistro === 'string' && /^SP-\d{3,}$/.test(saved.codigoRegistro)
            ? saved.codigoRegistro
            : savedCode,
          nombreRegistro: typeof saved.nombreRegistro === 'string' && saved.nombreRegistro.trim()
            ? saved.nombreRegistro.trim().slice(0, 80)
            : saved.nombre.trim().slice(0, 80),
          categoriaRegistro: typeof saved.categoriaRegistro === 'string'
            && saved.categoriaRegistro.trim()
            && saved.categoriaRegistro.trim().length <= 40
            ? saved.categoriaRegistro.trim()
            : saved.categoria.trim(),
          stock: countOr(saved.stock, 0),
          entradas: countOr(saved.entradas, 0),
          salidas: countOr(saved.salidas, 0)
        });
      });
    } else if (data.productos !== undefined) {
      global.console.error('El inventario guardado tiene un formato de productos inválido.');
    }

    if (Array.isArray(data.actividad)) {
      data.actividad.slice(0, MAX_ACTIVITY).forEach(function (item) {
        if (!item || typeof item.tipo !== 'string' || typeof item.detalle !== 'string') return;
        const fecha = new Date(item.fecha);
        if (!Number.isNaN(fecha.getTime())) {
          actividad.push({ tipo: item.tipo, detalle: item.detalle, fecha: fecha });
        }
      });
    }

    return {
      productos: productos,
      actividad: actividad,
      deletedProductIds: deletedProductIds
    };
  }

  function save(state) {
    if (!state || !Array.isArray(state.productos) || !Array.isArray(state.actividad)) {
      throw new Error('No se puede guardar un inventario con formato inválido.');
    }

    const data = {
      productos: state.productos.map(function (producto) {
        return {
          id: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          corto: producto.corto,
          categoria: producto.categoria,
          icon: producto.icon,
          registradoPor: producto.registradoPor,
          fechaRegistro: producto.fechaRegistro,
          unidadesRegistro: producto.unidadesRegistro,
          codigoRegistro: producto.codigoRegistro,
          nombreRegistro: producto.nombreRegistro,
          categoriaRegistro: producto.categoriaRegistro,
          stock: producto.stock,
          entradas: producto.entradas,
          salidas: producto.salidas
        };
      }),
      deletedProductIds: Array.isArray(state.deletedProductIds)
        ? Array.from(new Set(state.deletedProductIds.filter(function (id) {
          return typeof id === 'string';
        })))
        : [],
      actividad: state.actividad.slice(0, MAX_ACTIVITY).map(function (item) {
        return {
          tipo: item.tipo,
          detalle: item.detalle,
          fecha: item.fecha instanceof Date ? item.fecha.toISOString() : new Date(item.fecha).toISOString()
        };
      })
    };

    global.localStorage.setItem(KEY, JSON.stringify(data));
  }

  function nextCode(productos) {
    const highest = productos.reduce(function (current, producto) {
      const match = /^SP-(\d+)$/.exec(producto.codigo);
      return match ? Math.max(current, Number(match[1])) : current;
    }, 0);
    return 'SP-' + String(highest + 1).padStart(3, '0');
  }

  global.StudioInventory = {
    KEY: KEY,
    load: load,
    save: save,
    createProductId: createProductId,
    nextCode: nextCode,
    iconForCategory: iconForCategory
  };
})(window);
