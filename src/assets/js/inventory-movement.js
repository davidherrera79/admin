(function () {
  const mode = document.body.dataset.movement;
  const isExit = mode === 'salida';
  const form = document.getElementById('movementForm');
  const productSelect = document.getElementById('movementProduct');
  const codeInput = document.getElementById('movementCode');
  const quantityInput = document.getElementById('movementQuantity');
  const notice = document.getElementById('movementNotice');
  const ACTIVITY_PAGE_SIZE = 5;
  const productEditForm = document.getElementById('recentProductEditForm');
  const productDetailsModalElement = document.getElementById('recentProductDetailsModal');
  const productEditModalElement = document.getElementById('recentProductEditModal');
  const productDeleteModalElement = document.getElementById('recentProductDeleteModal');
  const productDetailsModal = productDetailsModalElement && typeof bootstrap !== 'undefined'
    ? bootstrap.Modal.getOrCreateInstance(productDetailsModalElement)
    : null;
  const productEditModal = productEditModalElement && typeof bootstrap !== 'undefined'
    ? bootstrap.Modal.getOrCreateInstance(productEditModalElement)
    : null;
  const productDeleteModal = productDeleteModalElement && typeof bootstrap !== 'undefined'
    ? bootstrap.Modal.getOrCreateInstance(productDeleteModalElement)
    : null;
  let state = StudioInventory.load();
  let activityPage = 1;
  let editingProductId = null;
  let deletingProductId = null;

  function showNotice(message, type) {
    notice.textContent = message;
    notice.className = 'alert alert-' + type;
    notice.classList.remove('d-none');
  }

  function createProductActions(item) {
    const cell = document.createElement('td');
    cell.className = 'text-end';
    if (!item.productId) {
      cell.textContent = '—';
      return cell;
    }

    const actions = document.createElement('div');
    actions.className = 'recent-product-actions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Acciones para ' + item.code);
    [
      { action: 'view', label: 'Visualizar', icon: 'bi-eye-fill' },
      { action: 'edit', label: 'Modificar', icon: 'bi-pencil-square' },
      { action: 'register', label: 'Registrar entrada', icon: 'bi-person-plus' },
      { action: 'delete', label: 'Eliminar', icon: 'bi-trash' }
    ].forEach(function (itemAction) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recent-product-action recent-product-action--' + itemAction.action;
      button.dataset.recentProductAction = itemAction.action;
      button.dataset.productId = item.productId;
      button.title = itemAction.label;
      button.setAttribute('aria-label', itemAction.label + ' ' + item.code);
      const icon = document.createElement('i');
      icon.className = 'bi ' + itemAction.icon;
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      actions.appendChild(button);
    });

    cell.appendChild(actions);
    return cell;
  }

  function renderPagination(pageCount) {
    const navigation = document.getElementById('movementPagination');
    const list = document.getElementById('movementPaginationList');
    if (!navigation || !list) return;

    list.replaceChildren();
    navigation.classList.toggle('d-none', pageCount <= 1);
    if (pageCount <= 1) return;

    function addPage(label, page, active, disabled, ariaLabel) {
      const item = document.createElement('li');
      item.className = 'page-item';
      if (active) item.classList.add('active');
      if (disabled) item.classList.add('disabled');

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'page-link';
      button.textContent = label;
      button.setAttribute('aria-label', ariaLabel || 'Página ' + page);
      if (active) button.setAttribute('aria-current', 'page');
      button.disabled = disabled;
      if (!disabled && page !== activityPage) {
        button.addEventListener('click', function () {
          activityPage = page;
          renderActivity();
        });
      }

      item.appendChild(button);
      list.appendChild(item);
    }

    addPage('Anterior', activityPage - 1, false, activityPage === 1, 'Página anterior');
    for (let page = 1; page <= pageCount; page += 1) {
      addPage(String(page), page, page === activityPage, false);
    }
    addPage('Siguiente', activityPage + 1, false, activityPage === pageCount, 'Página siguiente');
  }

  function renderActivity() {
    const list = document.getElementById('movementActivity');
    const activity = state.actividad.filter(function (item) {
      return item.tipo === mode;
    }).map(function (item) {
      const parts = item.detalle.split(' · ');
      const unitsText = parts.length > 1 ? parts.shift() : '';
      const code = /^SP-\d{3,}$/.test(parts[0]) ? parts.shift() : '—';
      const productName = parts.join(' · ') || (code === '—' ? item.detalle : '—');
      const product = state.productos.find(function (savedProduct) {
        return savedProduct.codigo === code
          || savedProduct.nombre === productName
          || savedProduct.corto === productName;
      });
      return {
        type: 'movement',
        productId: product ? product.id : null,
        code: code,
        detail: productName,
        category: product ? product.categoria : '—',
        displayDetail: item.detalle,
        units: unitsText.replace(/\s+uds?$/i, '').trim() || '—',
        registeredBy: '—',
        fecha: item.fecha
      };
    });

    if (!isExit) {
      state.productos.forEach(function (product) {
        const fecha = new Date(product.fechaRegistro);
        if (typeof product.fechaRegistro !== 'string' || Number.isNaN(fecha.getTime())) return;
        activity.push({
          type: 'product',
          productId: product.id,
          code: product.codigoRegistro || product.codigo,
          detail: product.nombreRegistro || product.nombre,
          category: product.categoriaRegistro || product.categoria,
          units: Number.isSafeInteger(product.unidadesRegistro) && product.unidadesRegistro >= 0
            ? String(product.unidadesRegistro)
            : '—',
          registeredBy: product.registradoPor || 'Invitado',
          fecha: fecha
        });
      });
    }

    activity.sort(function (a, b) {
      return b.fecha.getTime() - a.fecha.getTime();
    });
    const pageCount = Math.ceil(activity.length / ACTIVITY_PAGE_SIZE);
    activityPage = Math.min(activityPage, Math.max(pageCount, 1));
    const pageStart = (activityPage - 1) * ACTIVITY_PAGE_SIZE;
    const recentActivity = isExit
      ? activity.slice(0, 5)
      : activity.slice(pageStart, pageStart + ACTIVITY_PAGE_SIZE);
    if (!isExit) renderPagination(pageCount);
    list.replaceChildren();

    recentActivity.forEach(function (item) {
      if (isExit) {
        const row = document.createElement('li');
        row.className = 'list-group-item d-flex justify-content-between gap-3';
        const detail = document.createElement('span');
        detail.textContent = item.displayDetail;
        const date = document.createElement('time');
        date.className = 'text-muted text-nowrap';
        date.dateTime = item.fecha.toISOString();
        date.textContent = item.fecha.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
        row.append(detail, date);
        list.appendChild(row);
      } else {
        const row = document.createElement('tr');
        const code = document.createElement('td');
        code.textContent = item.code;
        const product = document.createElement('td');
        product.className = item.type === 'product' ? 'fw-semibold' : '';
        product.textContent = item.detail;
        const category = document.createElement('td');
        category.textContent = item.category;
        const units = document.createElement('td');
        units.className = 'text-nowrap';
        units.textContent = item.units;
        const user = document.createElement('td');
        user.textContent = item.registeredBy;
        const dateCell = document.createElement('td');
        const date = document.createElement('time');
        date.className = 'text-nowrap';
        date.dateTime = item.fecha.toISOString();
        date.textContent = item.fecha.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
        dateCell.appendChild(date);
        row.append(code, product, category, units, user, dateCell, createProductActions(item));
        list.appendChild(row);
      }
    });

    document.getElementById('activityEmpty').classList.toggle('d-none', recentActivity.length > 0);
  }

  function renderSummary() {
    document.getElementById('totalStock').textContent = state.productos.reduce(function (sum, product) {
      return sum + product.stock;
    }, 0).toLocaleString('es');
    document.getElementById('totalProducts').textContent = state.productos.length;
    document.getElementById('availableProducts').textContent = state.productos.filter(function (product) {
      return product.stock > 0;
    }).length;
  }

  function updateAvailable() {
    const product = state.productos.find(function (item) {
      return item.codigo === productSelect.value;
    });
    const available = document.getElementById('availableStock');
    const submit = form.querySelector('button[type="submit"]');

    available.textContent = product
      ? 'Disponible: ' + product.stock + ' unidades'
      : 'Selecciona un producto.';
    quantityInput.max = product ? String(isExit ? product.stock : Number.MAX_SAFE_INTEGER) : '';
    submit.disabled = !product || (isExit && product.stock === 0);
  }

  function renderProducts(selectedCode) {
    productSelect.replaceChildren();
    state.productos.forEach(function (product) {
      const option = document.createElement('option');
      option.value = product.codigo;
      option.textContent = product.codigo + ' · ' + product.nombre + ' (' + product.stock + ' uds)';
      option.disabled = isExit && product.stock === 0;
      productSelect.appendChild(option);
    });

    const selected = state.productos.find(function (product) {
      return product.codigo === selectedCode && (!isExit || product.stock > 0);
    }) || state.productos.find(function (product) {
      return !isExit || product.stock > 0;
    });
    if (selected) productSelect.value = selected.codigo;
    if (codeInput) codeInput.value = selected ? selected.codigo : '';
    updateAvailable();
  }

  function refresh(selectedCode) {
    state = StudioInventory.load();
    renderSummary();
    renderProducts(selectedCode);
    renderActivity();
  }

  function populateRecentProductCategories() {
    const options = document.getElementById('recentProductCategoryOptions');
    if (!options) return;
    options.replaceChildren();
    Array.from(new Set(state.productos.map(function (product) {
      return product.categoria;
    }))).forEach(function (category) {
      const option = document.createElement('option');
      option.value = category;
      options.appendChild(option);
    });
  }

  function openRecentProductEditor(product) {
    if (!productEditModal) return;
    editingProductId = product.id;
    document.getElementById('recentProductEditCode').value = product.codigo;
    document.getElementById('recentProductEditName').value = product.nombre;
    document.getElementById('recentProductEditCategory').value = product.categoria;
    document.getElementById('recentProductEditError').classList.add('d-none');
    populateRecentProductCategories();
    productEditModal.show();
  }

  function openRecentProductDetails(product) {
    if (!productDetailsModal) return;
    document.getElementById('recentProductDetailCode').textContent = product.codigo;
    document.getElementById('recentProductDetailName').textContent = product.nombre;
    document.getElementById('recentProductDetailCategory').textContent = product.categoria;
    document.getElementById('recentProductDetailStock').textContent = product.stock.toLocaleString('es') + ' unidades';
    document.getElementById('recentProductDetailEntries').textContent = product.entradas.toLocaleString('es') + ' unidades';
    document.getElementById('recentProductDetailExits').textContent = product.salidas.toLocaleString('es') + ' unidades';
    productDetailsModal.show();
  }

  function openRecentProductDelete(product) {
    if (!productDeleteModal) return;
    deletingProductId = product.id;
    document.getElementById('recentProductDeleteName').textContent = product.nombre;
    document.getElementById('recentProductDeleteCode').textContent = product.codigo;
    document.getElementById('recentProductDeleteWarning').textContent = product.stock > 0
      ? 'Se eliminarán también sus ' + product.stock.toLocaleString('es') + ' unidades de stock. Esta acción no se puede deshacer.'
      : 'Esta acción no se puede deshacer.';
    productDeleteModal.show();
  }

  if (!isExit) {
    document.getElementById('movementActivity').addEventListener('click', function (event) {
      const button = event.target.closest('button[data-recent-product-action]');
      if (!button) return;
      const product = state.productos.find(function (item) {
        return item.id === button.dataset.productId;
      });
      if (!product) {
        showNotice('El producto ya no está disponible.', 'danger');
        return;
      }

      if (button.dataset.recentProductAction === 'view') {
        openRecentProductDetails(product);
      } else if (button.dataset.recentProductAction === 'edit') {
        openRecentProductEditor(product);
      } else if (button.dataset.recentProductAction === 'register') {
        productSelect.value = product.codigo;
        if (codeInput) codeInput.value = product.codigo;
        updateAvailable();
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        quantityInput.focus();
        showNotice('Producto seleccionado. Indica la cantidad y registra la entrada.', 'info');
      } else if (button.dataset.recentProductAction === 'delete') {
        openRecentProductDelete(product);
      }
    });

    productEditForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const error = document.getElementById('recentProductEditError');
      error.classList.add('d-none');
      if (!productEditForm.reportValidity()) return;

      const code = document.getElementById('recentProductEditCode').value.trim().toUpperCase();
      const name = document.getElementById('recentProductEditName').value.trim();
      const requestedCategory = document.getElementById('recentProductEditCategory').value.trim();
      if (!/^SP-\d{3,}$/.test(code)) {
        error.textContent = 'El código debe tener el formato SP-001.';
        error.classList.remove('d-none');
        return;
      }
      if (!name || !requestedCategory) {
        error.textContent = 'Completa el nombre y la categoría del producto.';
        error.classList.remove('d-none');
        return;
      }

      const updatedState = StudioInventory.load();
      const product = updatedState.productos.find(function (item) {
        return item.id === editingProductId;
      });
      if (!product) {
        error.textContent = 'El producto ya no está disponible para modificar.';
        error.classList.remove('d-none');
        return;
      }
      if (updatedState.productos.some(function (item) {
        return item !== product && item.codigo === code;
      })) {
        error.textContent = 'Ya existe otro producto con ese código.';
        error.classList.remove('d-none');
        return;
      }

      const existingCategory = updatedState.productos.find(function (item) {
        return item.categoria.toLocaleLowerCase() === requestedCategory.toLocaleLowerCase();
      });
      const category = existingCategory ? existingCategory.categoria : requestedCategory;
      product.codigo = code;
      product.nombre = name;
      product.corto = name.slice(0, 24);
      product.categoria = category;
      product.icon = StudioInventory.iconForCategory(category);

      try {
        StudioInventory.save(updatedState);
        editingProductId = null;
        productEditModal.hide();
        showNotice('Se actualizaron los datos de ' + code + '.', 'success');
        refresh(code);
      } catch (saveError) {
        error.textContent = 'No se pudo guardar el producto: ' + saveError.message;
        error.classList.remove('d-none');
      }
    });

    document.getElementById('confirmRecentProductDelete').addEventListener('click', function () {
      const updatedState = StudioInventory.load();
      const index = updatedState.productos.findIndex(function (product) {
        return product.id === deletingProductId;
      });
      if (index < 0) {
        productDeleteModal.hide();
        showNotice('El producto ya no está disponible para eliminar.', 'danger');
        return;
      }

      const removedProduct = updatedState.productos[index];
      updatedState.productos.splice(index, 1);
      updatedState.deletedProductIds = Array.from(new Set((updatedState.deletedProductIds || []).concat(removedProduct.id)));
      try {
        StudioInventory.save(updatedState);
        deletingProductId = null;
        activityPage = 1;
        productDeleteModal.hide();
        showNotice('Se eliminó ' + removedProduct.codigo + ' del inventario.', 'success');
        refresh(productSelect.value);
      } catch (saveError) {
        showNotice('No se pudo eliminar el producto: ' + saveError.message, 'danger');
      }
    });

    productEditModalElement.addEventListener('hidden.bs.modal', function () {
      editingProductId = null;
    });
    productDeleteModalElement.addEventListener('hidden.bs.modal', function () {
      deletingProductId = null;
    });
  }

  productSelect.addEventListener('change', function () {
    const product = state.productos.find(function (item) {
      return item.codigo === productSelect.value;
    });
    if (codeInput) codeInput.value = product ? product.codigo : '';
    updateAvailable();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const product = state.productos.find(function (item) {
      return item.codigo === productSelect.value;
    });
    const newCode = codeInput ? codeInput.value.trim().toUpperCase() : product && product.codigo;
    const quantity = Number(quantityInput.value);
    if (!product) {
      showNotice('Selecciona un producto válido.', 'danger');
      return;
    }
    if (codeInput && !/^SP-\d{3,}$/.test(newCode)) {
      showNotice('El código debe tener el formato SP-001.', 'danger');
      return;
    }
    if (codeInput && state.productos.some(function (item) {
      return item !== product && item.codigo === newCode;
    })) {
      showNotice('Ya existe otro producto con ese código.', 'danger');
      return;
    }
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      showNotice('Ingresa una cantidad entera mayor que cero.', 'danger');
      return;
    }
    if (isExit && quantity > product.stock) {
      showNotice('Stock insuficiente. Disponible: ' + product.stock + ' unidades.', 'danger');
      return;
    }

    const code = newCode;
    const previous = {
      codigo: product.codigo,
      stock: product.stock,
      entradas: product.entradas,
      salidas: product.salidas
    };
    product.codigo = code;
    if (isExit) {
      product.stock -= quantity;
      product.salidas += quantity;
    } else {
      product.stock += quantity;
      product.entradas += quantity;
    }

    state.actividad.unshift({
      tipo: mode,
      detalle: (isExit ? '−' : '+') + quantity + ' uds · ' + product.codigo + ' · ' + product.nombre,
      fecha: new Date()
    });
    state.actividad.length = Math.min(state.actividad.length, 25);

    try {
      StudioInventory.save(state);
      showNotice((isExit ? 'Salida' : 'Entrada') + ' registrada correctamente para ' + code + '.', 'success');
      quantityInput.value = '1';
      if (!isExit) activityPage = 1;
      refresh(code);
    } catch (error) {
      product.codigo = previous.codigo;
      product.stock = previous.stock;
      product.entradas = previous.entradas;
      product.salidas = previous.salidas;
      state = StudioInventory.load();
      showNotice('No se pudo guardar el movimiento: ' + error.message, 'danger');
      refresh(code);
    }
  });

  window.addEventListener('storage', function (event) {
    if (event.key === StudioInventory.KEY) {
      if (!isExit) activityPage = 1;
      refresh(productSelect.value);
    }
  });

  refresh(window.location.hash.slice(1));
})();
