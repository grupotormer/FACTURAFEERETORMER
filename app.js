// Configuration and Keys
const appId = '5f559e4e-a33c-4f2e-9180-21b935687975';
const accessKey = 'V2-TTAaj-UPBlO-ccGTR-j5YTz-xopwO-0NLXj-SCe9c-aTTxF';
const baseUrl = `https://www.appsheet.com/api/v2/apps/${appId}/tables`;

// App State
let state = {
  clients: [],
  products: [],
  selectedClient: null,
  cart: [],
  productSearch: '',
  categoryFilter: '',
  clientSearch: ''
};

// UI Elements
const syncBtn = document.getElementById('btn-sync');
const syncIcon = document.getElementById('sync-icon');
const toastContainer = document.getElementById('toast-container');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingTitle = document.getElementById('loading-title');
const loadingSubtitle = document.getElementById('loading-subtitle');

const searchClientInput = document.getElementById('search-client');
const btnClearClient = document.getElementById('btn-clear-client');
const clientsDropdown = document.getElementById('clients-dropdown');
const clientBadge = document.getElementById('client-badge');
const selectedClientCard = document.getElementById('selected-client-card');

const scNombre = document.getElementById('sc-nombre');
const scNit = document.getElementById('sc-nit');
const scDireccion = document.getElementById('sc-direccion');
const scContacto = document.getElementById('sc-contacto');

const selectCategory = document.getElementById('select-category');
const searchProductInput = document.getElementById('search-product');
const catalogList = document.getElementById('catalog-list');
const catalogEmpty = document.getElementById('catalog-empty');

const cartItemsContainer = document.getElementById('cart-items-container');
const cartEmptyState = document.getElementById('cart-empty-state');
const cartCountBadge = document.getElementById('cart-count-badge');
const preventaNotas = document.getElementById('preventa-notas');

const totalSubtotal = document.getElementById('total-subtotal');
const totalIva = document.getElementById('total-iva');
const totalGeneral = document.getElementById('total-general');
const btnSubmitPreventa = document.getElementById('btn-submit-preventa');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  // Replace Lucide placeholders with SVG icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Set up event listeners
  setupEventListeners();

  // Load Initial Data
  fetchInitialData();
});

// Event Listeners Configuration
function setupEventListeners() {
  syncBtn.addEventListener('click', () => {
    showToast('Iniciando sincronización...', 'info');
    fetchInitialData();
  });

  // Client Search & Dropdown Events
  searchClientInput.addEventListener('input', (e) => {
    state.clientSearch = e.target.value.trim().toLowerCase();
    renderClientsDropdown();
  });

  searchClientInput.addEventListener('focus', () => {
    renderClientsDropdown();
  });

  // Click outside dropdown to close
  document.addEventListener('click', (e) => {
    if (!searchClientInput.contains(e.target) && !clientsDropdown.contains(e.target)) {
      clientsDropdown.classList.add('hidden');
    }
  });

  btnClearClient.addEventListener('click', () => {
    clearSelectedClient();
  });

  // Product Filter & Search Events
  selectCategory.addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    renderCatalog();
  });

  searchProductInput.addEventListener('input', (e) => {
    state.productSearch = e.target.value.trim().toLowerCase();
    renderCatalog();
  });

  // Submit Preventa Button
  btnSubmitPreventa.addEventListener('click', () => {
    submitPreventa();
  });
}

// Show overlay spinner
function showLoading(title, subtitle) {
  loadingTitle.textContent = title || 'Cargando datos...';
  loadingSubtitle.textContent = subtitle || 'Por favor, espera un momento.';
  loadingOverlay.classList.remove('hidden');
}

// Hide overlay spinner
function hideLoading() {
  loadingOverlay.classList.add('hidden');
}

// Show Toast Alert Notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center space-x-3 transform translate-y-2 opacity-0 transition duration-300 ease-out`;

  let iconName = 'check-circle';
  let bgClass = 'bg-green-50 border-green-200 text-green-800';

  if (type === 'error') {
    iconName = 'alert-triangle';
    bgClass = 'bg-red-50 border-red-200 text-red-800';
  } else if (type === 'info') {
    iconName = 'info';
    bgClass = 'bg-blue-50 border-blue-200 text-blue-800';
  } else if (type === 'warning') {
    iconName = 'alert-circle';
    bgClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
  }

  toast.className += ` ${bgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="h-5 w-5 flex-shrink-0"></i>
    <span class="flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 transition">
      <i data-lucide="x" class="h-4 w-4"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  if (window.lucide) {
    lucide.createIcons({ attrs: { class: 'h-4 w-4' } });
  }

  // Animation Trigger
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Auto Dismiss after 4s
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Fetch Initial Data from AppSheet API
async function fetchInitialData() {
  showLoading('Conectando a AppSheet', 'Obteniendo Catálogo y Clientes...');
  syncIcon.classList.add('animate-spin');
  syncBtn.disabled = true;

  try {
    // 1. Fetch CLIENTES
    const clientsPromise = fetchTableData('CLIENTES');
    // 2. Fetch stock
    const productsPromise = fetchTableData('stock');

    const [clientsRes, productsRes] = await Promise.all([clientsPromise, productsPromise]);

    state.clients = clientsRes || [];
    state.products = productsRes || [];

    // Populate Categories selector
    populateCategories();

    // Render components
    renderClientsDropdown();
    renderCatalog();
    renderCart();

    showToast('Datos actualizados de la nube', 'success');
  } catch (error) {
    console.error('Error fetching initial data:', error);
    showToast('Error al conectar con la base de datos de AppSheet', 'error');
  } finally {
    hideLoading();
    syncIcon.classList.remove('animate-spin');
    syncBtn.disabled = false;
  }
}

// Generic Fetch Table Function
async function fetchTableData(tableName) {
  const url = `${baseUrl}/${encodeURIComponent(tableName)}/Action`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': accessKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Action: 'Find',
      Properties: {
        Locale: 'en-US'
      },
      Rows: []
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status} for table ${tableName}`);
  }

  const data = await response.json();
  return data;
}

// Categories filter list populating
function populateCategories() {
  const categoriesSet = new Set();
  state.products.forEach(p => {
    if (p['Categoría']) {
      categoriesSet.add(p['Categoría'].trim());
    }
  });

  // Preserve the default first option "Todas las categorías"
  selectCategory.innerHTML = '<option value="">Todas las categorías</option>';

  const sortedCategories = Array.from(categoriesSet).sort();
  sortedCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectCategory.appendChild(opt);
  });
}

// Render clients list for search input dropdown
function renderClientsDropdown() {
  clientsDropdown.innerHTML = '';

  if (state.clientSearch === '' && document.activeElement !== searchClientInput) {
    clientsDropdown.classList.add('hidden');
    return;
  }

  const query = state.clientSearch;
  const filtered = state.clients.filter(client => {
    const nombre = (client.NombreCliente || '').toLowerCase();
    const nit = (client.NIT || '').toLowerCase();
    const id = (client.IDCliente || '').toLowerCase();
    return nombre.includes(query) || nit.includes(query) || id.includes(query);
  });

  if (filtered.length === 0) {
    clientsDropdown.innerHTML = `<div class="px-4 py-3 text-sm text-slate-500">No se encontraron clientes</div>`;
  } else {
    filtered.slice(0, 10).forEach(client => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-left px-4 py-2 hover:bg-primary-50 text-sm transition border-b border-slate-100 flex flex-col';
      btn.innerHTML = `
        <span class="font-semibold text-slate-900">${client.NombreCliente || 'Sin Nombre'}</span>
        <span class="text-xs text-slate-500 font-mono">ID / NIT: ${client.NIT || client.IDCliente || 'N/D'}</span>
      `;
      btn.addEventListener('click', () => {
        selectClient(client);
      });
      clientsDropdown.appendChild(btn);
    });
  }

  clientsDropdown.classList.remove('hidden');
}

// Select Client handler
function selectClient(client) {
  state.selectedClient = client;
  searchClientInput.value = client.NombreCliente;
  state.clientSearch = '';
  clientsDropdown.classList.add('hidden');
  btnClearClient.classList.remove('hidden');
  clientBadge.textContent = 'Cliente Seleccionado';
  clientBadge.className = 'bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full font-medium';

  // Fill details
  scNombre.textContent = client.NombreCliente || 'N/A';
  scNit.textContent = client.NIT || client.IDCliente || 'N/A';
  scDireccion.textContent = client.Direccion || 'No registrada';
  scContacto.textContent = `Tel: ${client.Telefono || 'N/A'} | Email: ${client.Email || 'N/A'}`;

  selectedClientCard.classList.remove('hidden');
  updateSubmitButtonState();
}

// Clear selected client
function clearSelectedClient() {
  state.selectedClient = null;
  searchClientInput.value = '';
  state.clientSearch = '';
  btnClearClient.classList.add('hidden');
  clientBadge.textContent = 'Sin Seleccionar';
  clientBadge.className = 'bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-medium';
  selectedClientCard.classList.add('hidden');
  updateSubmitButtonState();
}

// Render Products Catalog table
function renderCatalog() {
  catalogList.innerHTML = '';

  const filtered = state.products.filter(p => {
    // Search filter
    const matchesSearch =
      (p.Material || '').toLowerCase().includes(state.productSearch) ||
      (p.TextoBreveDelMaterial || '').toLowerCase().includes(state.productSearch) ||
      (p.Marca || '').toLowerCase().includes(state.productSearch);

    // Category filter
    const matchesCategory = !state.categoryFilter || p['Categoría'] === state.categoryFilter;

    return matchesSearch && matchesCategory;
  });

  if (filtered.length === 0) {
    catalogEmpty.classList.remove('hidden');
  } else {
    catalogEmpty.classList.add('hidden');

    filtered.slice(0, 100).forEach(product => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition text-sm';

      // Price processing
      const hasOffer = product.PrecioOferta && parseFloat(product.PrecioOferta) > 0;
      const basePrice = parseFloat(product.Precio) || 0;
      const offerPrice = parseFloat(product.PrecioOferta) || 0;
      const finalPrice = hasOffer ? offerPrice : basePrice;

      // Quantity stock
      const stock = parseInt(product.Stock) || parseInt(product.cantidad) || 0;

      // Cart Item Check
      const inCart = state.cart.find(item => item.Material === product.Material);
      const cartQty = inCart ? inCart.quantity : 0;
      const availableStock = stock - cartQty;

      // Price display
      let priceDisplay = '';
      if (hasOffer) {
        priceDisplay = `
          <div class="flex flex-col items-end">
            <span class="font-bold text-red-600">$${finalPrice.toFixed(4)}</span>
            <span class="text-[10px] text-slate-400 line-through">$${basePrice.toFixed(4)}</span>
          </div>
        `;
      } else {
        priceDisplay = `<span class="font-semibold text-slate-800">$${basePrice.toFixed(4)}</span>`;
      }

      tr.innerHTML = `
        <td class="px-4 py-3">
          <div class="font-medium text-slate-950">${product.TextoBreveDelMaterial || 'Sin Nombre'}</div>
          <div class="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
            <span>Cód: ${product.Material}</span>
            <span>•</span>
            <span class="italic text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">${product.Marca || 'Genérico'}</span>
          </div>
        </td>
        <td class="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">
          ${product['Categoría'] || 'General'}
        </td>
        <td class="px-4 py-3 text-right">
          <span class="font-mono text-xs ${availableStock <= 0 ? 'text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded' : 'text-slate-700'}">
            ${availableStock <= 0 ? 'Agotado (0)' : `${availableStock}`}
          </span>
        </td>
        <td class="px-4 py-3 text-right">
          ${priceDisplay}
        </td>
        <td class="px-4 py-3 text-center">
          <button
            type="button"
            onclick="addToCart('${product.Material}')"
            ${availableStock <= 0 ? 'disabled' : ''}
            class="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-primary-100 hover:bg-primary-600 hover:text-white text-primary-700 font-bold transition disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
          >
            <i data-lucide="plus" class="h-4 w-4"></i>
          </button>
        </td>
      `;

      catalogList.appendChild(tr);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

// Add item to shopping cart
window.addToCart = function(material) {
  const product = state.products.find(p => p.Material === material);
  if (!product) return;

  const stock = parseInt(product.Stock) || parseInt(product.cantidad) || 0;
  const existingIndex = state.cart.findIndex(item => item.Material === material);

  if (existingIndex > -1) {
    if (state.cart[existingIndex].quantity < stock) {
      state.cart[existingIndex].quantity += 1;
      showToast(`Cantidad aumentada para ${product.TextoBreveDelMaterial}`, 'success');
    } else {
      showToast('No puedes agregar más artículos que el stock disponible', 'warning');
      return;
    }
  } else {
    const basePrice = parseFloat(product.Precio) || 0;
    const offerPrice = parseFloat(product.PrecioOferta) || 0;
    const hasOffer = product.PrecioOferta && parseFloat(product.PrecioOferta) > 0;
    const finalPrice = hasOffer ? offerPrice : basePrice;

    state.cart.push({
      Material: product.Material,
      TextoBreveDelMaterial: product.TextoBreveDelMaterial,
      price: finalPrice,
      quantity: 1,
      stock: stock
    });
    showToast(`Producto agregado: ${product.TextoBreveDelMaterial}`, 'success');
  }

  renderCart();
  renderCatalog();
};

// Decrease item quantity in cart
window.decreaseCartQuantity = function(material) {
  const existingIndex = state.cart.findIndex(item => item.Material === material);
  if (existingIndex === -1) return;

  if (state.cart[existingIndex].quantity > 1) {
    state.cart[existingIndex].quantity -= 1;
  } else {
    state.cart.splice(existingIndex, 1);
    showToast('Producto eliminado del carrito', 'info');
  }

  renderCart();
  renderCatalog();
};

// Remove item entirely from cart
window.removeFromCart = function(material) {
  state.cart = state.cart.filter(item => item.Material !== material);
  showToast('Producto eliminado del carrito', 'info');
  renderCart();
  renderCatalog();
};

// Update item price in cart and dynamically refresh totals
window.updateCartPrice = function(material, value) {
  const item = state.cart.find(it => it.Material === material);
  if (!item) return;
  const newPrice = parseFloat(value) || 0.0;
  item.price = newPrice;

  // Update line total in DOM instantly
  const lineTotalEl = document.getElementById(`line-total-${material}`);
  if (lineTotalEl) {
    lineTotalEl.textContent = `$${(newPrice * item.quantity).toFixed(2)}`;
  }

  recalculateTotals();
};

// Render Cart Component & Recalculate Totals
function renderCart() {
  cartItemsContainer.innerHTML = '';

  if (state.cart.length === 0) {
    cartEmptyState.classList.remove('hidden');
    cartCountBadge.textContent = '0 ítems';
    cartCountBadge.className = 'bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded-full font-semibold';
  } else {
    cartEmptyState.classList.add('hidden');

    let totalItems = 0;
    state.cart.forEach(item => {
      totalItems += item.quantity;

      const div = document.createElement('div');
      div.className = 'bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col space-y-2 relative';

      const itemTotal = item.price * item.quantity;

      div.innerHTML = `
        <!-- Details & Remove -->
        <div class="flex justify-between items-start gap-2">
          <div class="flex-1">
            <h4 class="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">${item.TextoBreveDelMaterial}</h4>
            <span class="text-xs text-slate-400 font-mono">Cód: ${item.Material}</span>
          </div>
          <button onclick="removeFromCart('${item.Material}')" class="text-slate-400 hover:text-red-500 transition p-1">
            <i data-lucide="trash-2" class="h-4 w-4"></i>
          </button>
        </div>

        <!-- Quantity Adjuster & Row Total Price -->
        <div class="flex justify-between items-center pt-1 border-t border-slate-100">
          <div class="flex items-center space-x-1">
            <button onclick="decreaseCartQuantity('${item.Material}')" class="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 transition flex items-center justify-center text-slate-600 font-bold text-sm">
              -
            </button>
            <span class="w-8 text-center font-mono text-sm font-semibold text-slate-800">${item.quantity}</span>
            <button onclick="addToCart('${item.Material}')" class="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 active:bg-slate-200 transition flex items-center justify-center text-slate-600 font-bold text-sm">
              +
            </button>
          </div>
          <div class="text-right flex flex-col items-end">
            <div class="flex items-center gap-1">
              <span class="text-xs text-slate-400">$</span>
              <input type="number" value="${item.price}" min="0" step="any" oninput="updateCartPrice('${item.Material}', this.value)" class="w-20 text-right px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary-500 transition-all">
              <span class="text-[10px] text-slate-400">c/u</span>
            </div>
            <span class="font-bold text-slate-900 text-sm mt-0.5" id="line-total-${item.Material}">$${itemTotal.toFixed(2)}</span>
          </div>
        </div>
      `;

      cartItemsContainer.appendChild(div);
    });

    cartCountBadge.textContent = `${totalItems} ítem${totalItems > 1 ? 's' : ''}`;
    cartCountBadge.className = 'bg-primary-100 text-primary-800 text-xs px-2.5 py-1 rounded-full font-bold';

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  recalculateTotals();
  updateSubmitButtonState();
}

// Calculate subtotal, taxes (13%) and total price
function recalculateTotals() {
  let total = 0;
  state.cart.forEach(item => {
    total += item.price * item.quantity;
  });

  // Since Precio contains the final consumer price (with VAT/Iva already included as seen in Preventa tables),
  // we do reverse calculations matching the database models:
  // total is sum of line totals (which include tax)
  // subtotal (PrecioSinIva) = total / 1.13
  // Iva = total - subtotal
  const calculatedSubtotal = total / 1.13;
  const calculatedIva = total - calculatedSubtotal;

  totalSubtotal.textContent = `$${calculatedSubtotal.toFixed(2)}`;
  totalIva.textContent = `$${calculatedIva.toFixed(2)}`;
  totalGeneral.textContent = `$${total.toFixed(2)}`;

  // Save totals in state for submission
  state.calculatedTotals = {
    total: total.toFixed(2),
    subtotal: calculatedSubtotal.toFixed(6), // Store precise value, matching 'PrecioSinIva'
    iva: calculatedIva.toFixed(6)
  };
}

// Check if all fields are valid for submission
function updateSubmitButtonState() {
  const hasClient = !!state.selectedClient;
  const hasItems = state.cart.length > 0;

  btnSubmitPreventa.disabled = !(hasClient && hasItems);
}

// Helper to generate transaction ID matching standard format: e.g., 2026-01-M1P505-XXXXX
async function generateTransactionId() {
  const prefix = "2026-01-M1P505-";
  let maxNum = 0;

  // 1. Scan local storage fallback cache
  try {
    const raw = localStorage.getItem('appsheep_preventa');
    const localPreventas = raw ? JSON.parse(raw) : [];
    if (Array.isArray(localPreventas)) {
      localPreventas.forEach(p => {
        const id = p.id || '';
        if (id && id.startsWith(prefix)) {
          const suffix = id.substring(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Error parsing local storage preventas:', err);
  }

  // 2. Scan AppSheet Preventa table
  try {
    const preventas = await fetchTableData('Preventa');
    if (Array.isArray(preventas)) {
      preventas.forEach(row => {
        const id = row.IDTransacion || row.IDTransaccion || row.id || '';
        if (id && id.startsWith(prefix)) {
          const suffix = id.substring(prefix.length);
          const num = parseInt(suffix, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }
  } catch (err) {
    console.warn('Error fetching from AppSheet table for correlative ID, using local only:', err);
  }

  if (maxNum === 0) {
    maxNum = 331;
  }
  const nextNum = maxNum + 1;
  return `${prefix}${nextNum}`;
}

// Helper to generate Detalle UUID/hash
function generateDetalleId() {
  return Math.random().toString(36).substring(2, 10);
}

// Helper to format date in format MM/DD/YYYY HH:MM:SS
function formatAppSheetDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}

// Configuration for printing tickets
const DEFAULT_TICKET_CONFIG = {
  slogan: "Calidad y confianza en nuestros productos",
  company: "Juan Carlos Torres García",
  nit: "NIT: 0507-271277-101-0",
  footer1: "¡GRACIAS POR SU PREFERENCIA!",
  footer2: "Este documento no tiene validez fiscal"
};

// Option to print ticket after processing
function printTicket(transactionId, dateFormatted, preventaRow, detalleRows, clientPhone) {
  const canvas = document.getElementById('print-ticket-area');
  if (!canvas) return;

  // Read actual config from localStorage
  let ticketCfg;
  try {
    const raw = localStorage.getItem('ticket_config');
    ticketCfg = raw ? JSON.parse(raw) : DEFAULT_TICKET_CONFIG;
  } catch (e) {
    ticketCfg = DEFAULT_TICKET_CONFIG;
  }

  // Build items list
  let itemsHtml = '';
  detalleRows.forEach(d => {
    const material = d.ARTICULO;
    const nameToDisplay = d.TextoBreve || material;
    const qty = parseFloat(d.CANTIDAD) || 0;
    const price = parseFloat(d.PRECIO) || 0;
    const totalLine = parseFloat(d['TOTAL LINEA']) || (qty * price);

    itemsHtml += `
      <div style="margin-bottom: 5px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: bold; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${nameToDisplay.toUpperCase()}</span>
          <span>${totalLine.toFixed(2)} $</span>
        </div>
        <div style="font-size: 10px; color: #555; padding-left: 10px;">
          ${Number(qty.toFixed(3))} UNID x ${price.toFixed(2)} $
        </div>
      </div>
    `;
  });

  // Offline QR Code Generation
  let qrHtml = '';
  if (window.qrcode) {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(`PREVENTA-${transactionId}`);
      qr.make();
      qrHtml = qr.createImgTag(3, 0);
    } catch (e) {
      console.error('Error generating QR code:', e.message);
    }
  }

  canvas.innerHTML = `
    <div style="text-align: center; margin-bottom: 15px;">
      <img src="Logoferre.png" alt="Logo" style="margin: 0 auto 10px auto; display: block; height: 50px; max-height: 50px; object-fit: contain;">
      <p style="font-size: 11px; color: #444; margin: 0 0 2px 0;">${ticketCfg.slogan}</p>
      <h4 style="font-size: 13px; font-weight: bold; margin: 0 0 2px 0;">${ticketCfg.company}</h4>
      <p style="font-size: 11px; color: #444; margin: 0 0 5px 0;">${ticketCfg.nit}</p>
    </div>

    <div style="font-size: 11px; margin-bottom: 12px; line-height: 1.3;">
      <p style="margin: 2px 0;"><strong>FECHA:</strong> ${dateFormatted}</p>
      <p style="margin: 2px 0;"><strong>TICKET:</strong> #${transactionId.replace('2026-01-M1P505-', '')}</p>
      <p style="margin: 2px 0;"><strong>CLIENTE:</strong> ${preventaRow.NombreDelCliente.toUpperCase()}</p>
      <p style="margin: 2px 0;"><strong>TELF:</strong> ${clientPhone || 'SIN CONTACTO'}</p>
    </div>

    <p style="letter-spacing: -1px; margin: 8px 0; color: #666; font-size: 12px;">------------------------------------</p>

    <div style="font-size: 11px; margin-bottom: 10px;">
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px;">
        <span>CONCEPTO</span>
        <span>TOTAL</span>
      </div>
      ${itemsHtml}
    </div>

    <p style="letter-spacing: -1px; margin: 8px 0; color: #666; font-size: 12px;">------------------------------------</p>

    <div style="font-size: 11px; text-align: right; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; border-top: 1px dashed #333; padding-top: 6px;">
        <span>TOTAL:</span>
        <span>${parseFloat(preventaRow.total).toFixed(2)} $</span>
      </div>
    </div>

    <p style="letter-spacing: -1px; margin: 15px 0 10px 0; color: #666; font-size: 12px;">------------------------------------</p>

    <div style="text-align: center; font-size: 10px; line-height: 1.3;">
      <p style="font-weight: bold; margin: 3px 0;">${ticketCfg.footer1}</p>
      <p style="color: #666; font-size: 9px; margin: 0 0 12px 0;">${ticketCfg.footer2}</p>

      <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
        ${qrHtml}
        <span style="font-size: 8px; color: #777; font-family: monospace;">*PREVENTA-${transactionId}*</span>
      </div>
    </div>
  `;

  setTimeout(() => {
    window.print();
  }, 150);
}

// Submit Preventa to AppSheet via API v2
async function submitPreventa() {
  if (!state.selectedClient || state.cart.length === 0) {
    showToast('Por favor, selecciona un cliente y productos.', 'warning');
    return;
  }

  showLoading('Procesando Preventa', 'Enviando información del pedido a AppSheet...');

  const transactionId = await generateTransactionId();
  const dateFormatted = formatAppSheetDate(new Date());
  const notasText = preventaNotas.value.trim();

  // Create Header Object
  const preventaRow = {
    IDTransacion: transactionId,
    FECHA: dateFormatted,
    IDcliente: state.selectedClient.IDCliente,
    subtotal: state.calculatedTotals.subtotal,
    total: state.calculatedTotals.total,
    PrecioSinIva: state.calculatedTotals.subtotal,
    Iva: state.calculatedTotals.iva,
    NombreDelCliente: state.selectedClient.NombreCliente,
    Direccion: state.selectedClient.Direccion || '',
    Notas: notasText,
    Estado: 'Pendiente'
  };

  // Create Details Rows array
  const detalleRows = state.cart.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    const itemSubtotal = itemTotal / 1.13;
    const itemIva = itemTotal - itemSubtotal;

    return {
      IDDETALLE: generateDetalleId(),
      IDTransaccion: transactionId,
      CANTIDAD: String(item.quantity),
      ARTICULO: item.Material,
      PRECIO: String(item.price),
      IMPUESTO: itemIva.toFixed(6),
      'TOTAL LINEA': itemTotal.toFixed(2),
      TextoBreve: item.TextoBreveDelMaterial,
      PRECIOSS: String(item.price),
      CambioDePrecio: '0',
      Cliente: state.selectedClient.IDCliente,
      NombreDelCliente: state.selectedClient.NombreCliente,
      FechaYHora: dateFormatted,
      TotalPreventaCount: state.calculatedTotals.total
    };
  });

  try {
    // 1. Add Preventa Header
    const preventaRes = await addTableRow('Preventa', [preventaRow]);

    // 2. Add Detalle Preventa Items
    const detalleRes = await addTableRow('DETALLE_PREVENTA', detalleRows);

    // 3. Force AppSheet to recalculate formulas by Editing the parent row
    await editTableRow('Preventa', [{ IDTransacion: transactionId }]);

    showToast(`¡Preventa ${transactionId} procesada con éxito!`, 'success');

    // Imprimir ticket de preventa
    const clientPhone = state.selectedClient.Telefono || 'SIN CONTACTO';
    printTicket(transactionId, dateFormatted, preventaRow, detalleRows, clientPhone);

    // Reset state & Clear cart
    state.cart = [];
    preventaNotas.value = '';
    clearSelectedClient();

    // Refresh stock list from AppSheet to get fresh numbers
    await fetchInitialData();

  } catch (error) {
    console.error('Error submitting preventa:', error);
    showToast('Ocurrió un error al registrar la preventa en AppSheet. Inténtalo de nuevo.', 'error');
    hideLoading();
  }
}

// Send POST to AppSheet Add API Action
async function addTableRow(tableName, rowsArray) {
  const url = `${baseUrl}/${encodeURIComponent(tableName)}/Action`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': accessKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Action: 'Add',
      Properties: {
        Locale: 'en-US'
      },
      Rows: rowsArray
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status} adding rows to table ${tableName}`);
  }

  const data = await response.json();
  return data;
}

// Send POST to AppSheet Edit API Action
async function editTableRow(tableName, rowsArray) {
  const url = `${baseUrl}/${encodeURIComponent(tableName)}/Action`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'ApplicationAccessKey': accessKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Action: 'Edit',
      Properties: {
        Locale: 'en-US'
      },
      Rows: rowsArray
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status} editing rows in table ${tableName}`);
  }

  const data = await response.json();
  return data;
}
