// ============================================
// GESTIÓN DE VENTAS
// ============================================

import { 
    getProducts, 
    getSales, 
    saveSale, 
    saveMultiSale, 
    undoSale, 
    saveInventoryMovement, 
    listenSales,
    saveProduct
} from '../firebase-config.js';

import { 
    formatCurrency, 
    roundToTwo, 
    formatDate, 
    showNotification, 
    getPriceAsNumber, 
    calculateSalePrice 
} from './utils.js';

// ✅ IMPORTAR updateFinancialPanel
import { updateFinancialPanel } from './finances.js';

// ============================================
// VARIABLES GLOBALES (de este módulo)
// ============================================

let saleItems = [];
let currentUser = null;

// ============================================
// VARIABLES PARA FILTRO DE VENTAS
// ============================================

let allSalesData = [];
let currentSalesFilter = { from: null, to: null };
let isFilterActive = false;

// ✅ Inicializar window.allSalesData
window.allSalesData = allSalesData;

// ============================================
// RENDERIZAR VENTAS
// ============================================

export const renderSales = (sales) => {
    const container = document.getElementById('salesList');
    if (!container) return;
    
    if (!sales || sales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><i class="fas fa-money-bill-wave"></i> No hay ventas registradas</p>
            </div>
        `;
        return;
    }
    
    // ✅ ORDENAR MANUALMENTE POR createdAt (más reciente primero)
    const salesOrdenadas = [...sales].sort((a, b) => {
        let fechaA = new Date(0);
        let fechaB = new Date(0);
        
        if (a.createdAt) {
            if (typeof a.createdAt === 'object' && a.createdAt !== null && typeof a.createdAt.toDate === 'function') {
                fechaA = a.createdAt.toDate();
            } else if (typeof a.createdAt === 'string') {
                fechaA = new Date(a.createdAt);
            } else if (a.createdAt.seconds) {
                fechaA = new Date(a.createdAt.seconds * 1000);
            }
        }
        
        if (b.createdAt) {
            if (typeof b.createdAt === 'object' && b.createdAt !== null && typeof b.createdAt.toDate === 'function') {
                fechaB = b.createdAt.toDate();
            } else if (typeof b.createdAt === 'string') {
                fechaB = new Date(b.createdAt);
            } else if (b.createdAt.seconds) {
                fechaB = new Date(b.createdAt.seconds * 1000);
            }
        }
        
        return fechaB - fechaA;
    });
    
    let html = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-calendar-alt"></i> Fecha</th>
                        <th><i class="fas fa-box"></i> Productos</th>
                        <th><i class="fas fa-hashtag"></i> Cantidad</th>
                        <th><i class="fas fa-dollar-sign"></i> Total</th>
                        <th><i class="fas fa-user"></i> Usuario</th>
                        <th><i class="fas fa-cogs"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    // Mostrar hasta 500 ventas (o todas si son menos)
    const maxVentas = 500;
    const ventasAMostrar = salesOrdenadas.slice(0, maxVentas);
    
    ventasAMostrar.forEach(sale => {
        let productsList = '';
        let totalItems = 0;
        
        if (sale.items && Array.isArray(sale.items)) {
            productsList = sale.items.map(item => 
                `${item.productName} (${item.quantity})`
            ).join(', ');
            totalItems = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        } else {
            productsList = sale.productName || 'Producto desconocido';
            totalItems = sale.quantity || 0;
        }
        
        let dateStr = 'Fecha desconocida';
        if (sale.createdAt) {
            if (typeof sale.createdAt === 'object' && sale.createdAt !== null && typeof sale.createdAt.toDate === 'function') {
                dateStr = formatDate(sale.createdAt.toDate());
            } else if (typeof sale.createdAt === 'string') {
                dateStr = formatDate(sale.createdAt);
            } else if (sale.createdAt.seconds) {
                dateStr = formatDate(new Date(sale.createdAt.seconds * 1000));
            }
        } else if (sale.saleDate) {
            dateStr = formatDate(sale.saleDate);
        }
        
        html += `
            <tr>
                <td><i class="fas fa-clock"></i> ${dateStr}</td>
                <td><strong>${productsList}</strong></td>
                <td>${totalItems}</td>
                <td><strong style="color: #48bb78;"><i class="fas fa-dollar-sign"></i> ${formatCurrency(sale.total || sale.totalPrice || 0)}</strong></td>
                <td><i class="fas fa-user"></i> ${sale.user || 'Sistema'}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="window.undoSaleHandler('${sale.id}')">
                        <i class="fas fa-undo"></i> Deshacer
                    </button>
                </td>
            </tr>
        `;
    });
    
    if (sales.length > maxVentas) {
        html += `
            <tr>
                <td colspan="6" style="text-align:center; color:var(--text-muted);">
                    <i class="fas fa-info-circle"></i> Mostrando ${maxVentas} de ${sales.length} ventas
                    <br><small>💡 Usa el filtro por fechas o descarga el CSV para ver todas</small>
                </td>
            </tr>
        `;
    }
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
};

// ============================================
// FUNCIONES DE VENTA SIMPLE
// ============================================

export const registerSale = async () => {
    const productId = document.getElementById('saleProduct').value;
    const quantity = parseInt(document.getElementById('saleQuantity').value);
    const unitPrice = parseFloat(document.getElementById('salePrice').value);
    
    if (!productId || !quantity || quantity <= 0 || !unitPrice || unitPrice <= 0) {
        showNotification('❌ Completa todos los campos correctamente', 'error');
        return;
    }
    
    try {
        const products = await getProducts();
        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('❌ Producto no encontrado', 'error');
            return;
        }
        
        if ((product.stock || 0) < quantity) {
            showNotification(`❌ Stock insuficiente (Stock actual: ${product.stock})`, 'error');
            return;
        }
        
        const sale = {
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            unitPrice: unitPrice,
            totalPrice: roundToTwo(unitPrice * quantity),
            saleDate: new Date().toISOString(),
            user: currentUser?.email || 'Sistema'
        };
        
        await saveSale(sale);
        
        product.stock = (product.stock || 0) - quantity;
        await saveProduct(product, product.id);
        
        await saveInventoryMovement({
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            operation: 'subtract',
            timestamp: new Date().toISOString(),
            user: currentUser?.email || 'Sistema'
        });
        
        showNotification(`✅ Venta registrada: ${product.name} x${quantity} = ${formatCurrency(sale.totalPrice)}`, 'success');
        
        await updateFinancialPanel();
        
        document.getElementById('saleProduct').value = '';
        document.getElementById('saleQuantity').value = '';
        document.getElementById('salePrice').value = '';
        document.getElementById('saleTotal').value = '';
        
        // ✅ Recargar ventas para actualizar la lista
        await loadSales();
        
    } catch (error) {
        console.error(error);
        showNotification('❌ Error al registrar venta', 'error');
    }
};

export const calculateSaleTotal = () => {
    const quantity = parseInt(document.getElementById('saleQuantity').value) || 0;
    const price = parseFloat(document.getElementById('salePrice').value) || 0;
    const total = quantity * price;
    document.getElementById('saleTotal').value = total > 0 ? formatCurrency(total) : '';
};

export const loadProductPrice = async () => {
    const productId = document.getElementById('saleProduct').value;
    const priceInput = document.getElementById('salePrice');
    const quantityInput = document.getElementById('saleQuantity');
    
    if (!productId) {
        priceInput.value = '';
        document.getElementById('saleTotal').value = '';
        return;
    }
    
    try {
        const products = await getProducts();
        const product = products.find(p => p.id === productId);
        
        if (!product) {
            priceInput.value = '';
            document.getElementById('saleTotal').value = '';
            return;
        }
        
        let price = getPriceAsNumber(product);
        if (!price || isNaN(price) || price <= 0) {
            price = calculateSalePrice(product.cost, product.type, product.batchSize);
        }
        
        priceInput.value = price;
        
        const quantity = parseInt(quantityInput.value) || 1;
        const total = quantity * price;
        document.getElementById('saleTotal').value = total > 0 ? formatCurrency(total) : '';
        
        priceInput.style.borderColor = '#48bb78';
        priceInput.style.background = '#f0fff4';
        setTimeout(() => {
            priceInput.style.borderColor = 'var(--border-color)';
            priceInput.style.background = 'var(--readonly-bg)';
        }, 1500);
        
        showNotification(`💰 Precio cargado: ${formatCurrency(price)}`, 'info');
        
    } catch (error) {
        console.error('Error al cargar precio:', error);
        showNotification('❌ Error al cargar el precio', 'error');
    }
};

export const updateSaleProducts = async (products) => {
    const select = document.getElementById('saleProduct');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value=""><i class="fas fa-search"></i> Seleccionar producto...</option>';
    
    if (!products || products.length === 0) {
        select.innerHTML += '<option value="" disabled><i class="fas fa-box-open"></i> No hay productos disponibles</option>';
        return;
    }
    
    products.forEach(product => {
        const stock = product.stock || 0;
        const option = document.createElement('option');
        option.value = product.id;
        
        let price = getPriceAsNumber(product);
        if (!price || isNaN(price) || price <= 0) {
            price = calculateSalePrice(product.cost, product.type, product.batchSize);
        }
        
        option.textContent = `${product.name} (Stock: ${stock} | Precio: ${formatCurrency(price)})`;
        if (stock <= 0) {
            option.disabled = true;
            option.textContent += ' ⚠️ Sin stock';
        }
        select.appendChild(option);
    });
    
    if (currentValue) {
        select.value = currentValue;
        await loadProductPrice();
    }
};

// ============================================
// FUNCIONES DE VENTA MÚLTIPLE
// ============================================

const populateMultiSaleProducts = async () => {
    const select = document.getElementById('multiSaleProduct');
    const products = await getProducts();
    
    select.innerHTML = '<option value=""><i class="fas fa-search"></i> Seleccionar producto...</option>';
    products.forEach(product => {
        const stock = product.stock || 0;
        if (stock > 0) {
            const option = document.createElement('option');
            option.value = product.id;
            let price = getPriceAsNumber(product);
            if (!price || isNaN(price) || price <= 0) {
                price = calculateSalePrice(product.cost, product.type, product.batchSize);
            }
            option.textContent = `${product.name} (Stock: ${stock} | ${formatCurrency(price)})`;
            option.dataset.price = price;
            option.dataset.name = product.name;
            select.appendChild(option);
        }
    });
};

const renderSaleItemsList = () => {
    const container = document.getElementById('saleItemsList');
    
    if (saleItems.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);"><i class="fas fa-box-open"></i> No hay productos agregados</p>';
        return;
    }
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th><i class="fas fa-box"></i> Producto</th>
                    <th><i class="fas fa-hashtag"></i> Cantidad</th>
                    <th><i class="fas fa-tag"></i> Precio Unit.</th>
                    <th><i class="fas fa-calculator"></i> Subtotal</th>
                    <th><i class="fas fa-cogs"></i> Acción</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    saleItems.forEach((item, index) => {
        html += `
            <tr>
                <td><strong>${item.productName}</strong></td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.unitPrice)}</td>
                <td><strong style="color: #48bb78;">${formatCurrency(item.totalPrice)}</strong></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="window.removeItemFromSale(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
};

const updateMultiSaleSummary = () => {
    const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
    document.getElementById('multiSaleSubtotal').textContent = formatCurrency(subtotal);
    document.getElementById('multiSaleTotal').textContent = formatCurrency(subtotal);
};

export const openMultiSaleModal = async () => {
    saleItems = [];
    document.getElementById('multiSaleModal').style.display = 'flex';
    document.getElementById('multiSaleMessage').textContent = '';
    document.getElementById('saleItemsList').innerHTML = '<p style="color: var(--text-muted);"><i class="fas fa-box-open"></i> No hay productos agregados</p>';
    updateMultiSaleSummary();
    await populateMultiSaleProducts();
};

export const addItemToSale = () => {
    const select = document.getElementById('multiSaleProduct');
    const quantity = parseInt(document.getElementById('multiSaleQuantity').value) || 1;
    const productId = select.value;
    const selectedOption = select.options[select.selectedIndex];
    
    if (!productId) {
        showNotification('❌ Selecciona un producto', 'error');
        return;
    }
    
    if (quantity <= 0) {
        showNotification('❌ Ingresa una cantidad válida', 'error');
        return;
    }
    
    const existingIndex = saleItems.findIndex(item => item.productId === productId);
    if (existingIndex !== -1) {
        saleItems[existingIndex].quantity += quantity;
        saleItems[existingIndex].totalPrice = saleItems[existingIndex].quantity * saleItems[existingIndex].unitPrice;
    } else {
        saleItems.push({
            productId: productId,
            productName: selectedOption.dataset.name,
            quantity: quantity,
            unitPrice: parseFloat(selectedOption.dataset.price),
            totalPrice: quantity * parseFloat(selectedOption.dataset.price)
        });
    }
    
    renderSaleItemsList();
    updateMultiSaleSummary();
    document.getElementById('multiSaleQuantity').value = 1;
    select.value = '';
    showNotification(`✅ ${selectedOption.dataset.name} agregado`, 'success');
};

export const removeItemFromSale = (index) => {
    saleItems.splice(index, 1);
    renderSaleItemsList();
    updateMultiSaleSummary();
};

export const confirmMultiSale = async () => {
    const messageEl = document.getElementById('multiSaleMessage');
    
    if (saleItems.length === 0) {
        messageEl.textContent = '❌ Agrega al menos un producto';
        messageEl.style.color = '#f56565';
        return;
    }
    
    try {
        const products = await getProducts();
        for (const item of saleItems) {
            const product = products.find(p => p.id === item.productId);
            if (!product || (product.stock || 0) < item.quantity) {
                showNotification(`❌ Stock insuficiente para ${item.productName}`, 'error');
                return;
            }
        }
        
        const subtotal = saleItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        await saveMultiSale({
            items: saleItems,
            subtotal: subtotal,
            total: subtotal,
            user: currentUser?.email || 'Sistema'
        });
        
        for (const item of saleItems) {
            const product = products.find(p => p.id === item.productId);
            product.stock = (product.stock || 0) - item.quantity;
            await saveProduct(product, product.id);
            
            await saveInventoryMovement({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                operation: 'subtract',
                timestamp: new Date().toISOString(),
                user: currentUser?.email || 'Sistema'
            });
        }
        
        document.getElementById('multiSaleModal').style.display = 'none';
        showNotification(`✅ Venta registrada: ${formatCurrency(subtotal)}`, 'success');
        
        await updateFinancialPanel();
        
        // ✅ Recargar ventas para actualizar la lista
        await loadSales();
        
    } catch (error) {
        messageEl.textContent = '❌ Error al registrar venta';
        messageEl.style.color = '#f56565';
    }
};

// ============================================
// DESHACER VENTA (CORREGIDO - SIN DUPLICACIÓN)
// ============================================

export const undoSaleHandler = async (saleId) => {
    if (!confirm('¿Estás seguro de deshacer esta venta?\nSe devolverá el stock de todos los productos.')) return;
    
    try {
        // ✅ undoSale maneja TODO: restaurar stock + eliminar venta + registrar movimiento
        // Esto funciona tanto para ventas simples como múltiples
        await undoSale(saleId);
        
        // Actualizar la interfaz
        await updateFinancialPanel();
        
        // Recargar productos para mostrar el stock actualizado
        const updatedProducts = await getProducts();
        if (window.renderProducts) {
            window.renderProducts(updatedProducts);
        }
        if (window.renderInventory) {
            window.renderInventory(updatedProducts);
        }
        
        // Recargar ventas
        await loadSales();
        
        showNotification('✅ Venta deshecha y stock restaurado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al deshacer venta:', error);
        showNotification('❌ Error al deshacer venta', 'error');
    }
};

// ============================================
// ACTUALIZAR RESUMEN DE VENTAS
// ============================================

export const updateSalesSummary = (sales) => {
    const container = document.getElementById('salesSummary');
    if (!container) return;
    
    if (!sales || sales.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><i class="fas fa-chart-pie"></i> No hay ventas para mostrar</p>
            </div>
        `;
        return;
    }
    
    const total = sales.length;
    const revenue = sales.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
    const avg = total > 0 ? revenue / total : 0;
    const maxSale = sales.length > 0 ? Math.max(...sales.map(s => s.total || s.totalPrice || 0)) : 0;
    
    container.innerHTML = `
        <div class="summary-cards">
            <div class="card card-primary">
                <div class="card-icon"><i class="fas fa-chart-bar"></i></div>
                <h4><i class="fas fa-shopping-cart"></i> Total Ventas</h4>
                <p class="number">${total}</p>
            </div>
            <div class="card card-success">
                <div class="card-icon"><i class="fas fa-dollar-sign"></i></div>
                <h4><i class="fas fa-coins"></i> Ingresos Totales</h4>
                <p class="number">${formatCurrency(revenue)}</p>
            </div>
            <div class="card card-info">
                <div class="card-icon"><i class="fas fa-calculator"></i></div>
                <h4><i class="fas fa-chart-line"></i> Ticket Promedio</h4>
                <p class="number">${formatCurrency(avg)}</p>
            </div>
            <div class="card card-warning">
                <div class="card-icon"><i class="fas fa-trophy"></i></div>
                <h4><i class="fas fa-crown"></i> Venta Máxima</h4>
                <p class="number">${formatCurrency(maxSale)}</p>
            </div>
        </div>
    `;
};

// ============================================
// FUNCIONES DE FILTRO POR FECHA (MEJORADAS)
// ============================================

/**
 * Obtiene la fecha de una venta en formato Date
 * Maneja TODOS los formatos posibles de Firebase
 */
const getSaleDate = (sale) => {
    let date = null;
    
    // Lista de campos que pueden contener la fecha
    const camposFecha = ['createdAt', 'saleDate', 'fecha', 'date', 'timestamp'];
    
    for (const campo of camposFecha) {
        if (sale[campo] !== undefined && sale[campo] !== null) {
            const valor = sale[campo];
            
            // 1. Firebase Timestamp con toDate()
            if (typeof valor === 'object' && valor !== null && typeof valor.toDate === 'function') {
                try {
                    date = valor.toDate();
                    break;
                } catch (e) {
                    // Si falla, continuar
                }
            }
            
            // 2. Firebase Timestamp con seconds (serializado)
            if (typeof valor === 'object' && valor !== null && valor.seconds !== undefined) {
                try {
                    date = new Date(valor.seconds * 1000);
                    break;
                } catch (e) {
                    // Si falla, continuar
                }
            }
            
            // 3. String ISO
            if (typeof valor === 'string') {
                try {
                    const parsed = new Date(valor);
                    if (!isNaN(parsed.getTime())) {
                        date = parsed;
                        break;
                    }
                } catch (e) {
                    // Si falla, continuar
                }
            }
            
            // 4. Número (timestamp en milisegundos)
            if (typeof valor === 'number') {
                try {
                    date = new Date(valor);
                    if (!isNaN(date.getTime())) {
                        break;
                    }
                } catch (e) {
                    // Si falla, continuar
                }
            }
        }
    }
    
    // Si no se encontró fecha, usar fecha actual como fallback
    if (!date || isNaN(date.getTime())) {
        console.warn('⚠️ No se pudo obtener fecha para la venta:', sale.id);
        return new Date(0);
    }
    
    // ✅ Normalizar a fecha local (sin hora)
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return new Date(year, month, day);
};

/**
 * Formatea una fecha para mostrar en el mensaje de filtro
 * Convierte YYYY-MM-DD a formato legible en español
 */
const formatDateForFilter = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Formatea una fecha para input type="date" (YYYY-MM-DD)
 */
const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Aplica el filtro de fechas a las ventas
 */
export const filterSalesByDate = (fromDate, toDate) => {
    currentSalesFilter.from = fromDate;
    currentSalesFilter.to = toDate;
    isFilterActive = !!(fromDate || toDate);
    
    let filtered = allSalesData;
    
    if (fromDate) {
        const parts = fromDate.split('-');
        const from = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        from.setHours(0, 0, 0, 0);
        
        filtered = filtered.filter(sale => {
            const saleDate = getSaleDate(sale);
            return saleDate >= from;
        });
    }
    
    if (toDate) {
        const parts = toDate.split('-');
        const to = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        to.setHours(23, 59, 59, 999);
        
        filtered = filtered.filter(sale => {
            const saleDate = getSaleDate(sale);
            return saleDate <= to;
        });
    }
    
    const totalVentas = filtered.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
    
    const countEl = document.getElementById('filteredSalesCount');
    if (countEl) {
        countEl.textContent = filtered.length;
    }
    
    const totalEl = document.getElementById('filteredSalesTotal');
    if (totalEl) {
        totalEl.textContent = `| Total: ${formatCurrency(totalVentas)}`;
    }
    
    // Mostrar mensaje de filtro activo
    const messageEl = document.getElementById('filterActiveMessage');
    const messageTextEl = document.getElementById('filterMessageText');
    
    if (isFilterActive && messageEl) {
        messageEl.style.display = 'block';
        let message = '';
        if (fromDate && toDate) {
            message = `📅 Ventas del ${formatDateForFilter(fromDate)} al ${formatDateForFilter(toDate)}`;
        } else if (fromDate) {
            message = `📅 Ventas desde ${formatDateForFilter(fromDate)}`;
        } else if (toDate) {
            message = `📅 Ventas hasta ${formatDateForFilter(toDate)}`;
        }
        
        // ✅ Agregar información si no hay ventas
        if (filtered.length === 0) {
            message += ` ❌ No hay ventas en este período. Prueba con otras fechas.`;
        }
        
        if (messageTextEl) {
            messageTextEl.textContent = `${message} (${filtered.length} ventas, ${formatCurrency(totalVentas)})`;
        }
    } else if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    // ✅ Actualizar window.allSalesData con los datos filtrados
    window.allSalesData = filtered;
    
    renderSales(filtered);
    updateSalesSummary(filtered);
    
    return filtered;
};

/**
 * Limpia el filtro de fechas
 */
export const clearSalesFilter = () => {
    currentSalesFilter = { from: null, to: null };
    isFilterActive = false;
    
    const fromInput = document.getElementById('filterSalesFrom');
    const toInput = document.getElementById('filterSalesTo');
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    
    const messageEl = document.getElementById('filterActiveMessage');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
    
    const countEl = document.getElementById('filteredSalesCount');
    if (countEl) {
        countEl.textContent = allSalesData.length;
    }
    
    const totalEl = document.getElementById('filteredSalesTotal');
    if (totalEl) {
        const total = allSalesData.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
        totalEl.textContent = `| Total: ${formatCurrency(total)}`;
    }
    
    // ✅ Restaurar window.allSalesData
    window.allSalesData = allSalesData;
    
    renderSales(allSalesData);
    updateSalesSummary(allSalesData);
};

/**
 * Filtra ventas de la semana actual
 */
export const filterThisWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    const fromStr = formatDateInput(monday);
    const toStr = formatDateInput(sunday);
    
    const fromInput = document.getElementById('filterSalesFrom');
    const toInput = document.getElementById('filterSalesTo');
    
    if (fromInput) fromInput.value = fromStr;
    if (toInput) toInput.value = toStr;
    
    filterSalesByDate(fromStr, toStr);
    
    showNotification(`📅 Mostrando ventas de la semana (${formatDateForFilter(fromStr)} - ${formatDateForFilter(toStr)})`, 'info');
};

/**
 * Filtra ventas del mes actual
 */
export const filterThisMonth = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const fromStr = formatDateInput(firstDay);
    const toStr = formatDateInput(lastDay);
    
    const fromInput = document.getElementById('filterSalesFrom');
    const toInput = document.getElementById('filterSalesTo');
    
    if (fromInput) fromInput.value = fromStr;
    if (toInput) toInput.value = toStr;
    
    filterSalesByDate(fromStr, toStr);
    
    showNotification(`📅 Mostrando ventas del mes de ${today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`, 'info');
};

// ============================================
// CARGAR VENTAS (CON DIAGNÓSTICO Y ACTUALIZACIÓN DE window)
// ============================================

export const loadSales = async () => {
    try {
        const sales = await getSales();
        allSalesData = sales || [];
        
        // ✅ ACTUALIZAR window.allSalesData
        window.allSalesData = allSalesData;
        
        console.log('📊 Ventas cargadas:', allSalesData.length);
        
        // ✅ DIAGNÓSTICO: Ver las primeras fechas
        if (allSalesData.length > 0) {
            console.log('📅 Ejemplo de fecha de la primera venta:');
            const primera = allSalesData[0];
            console.log('  createdAt:', primera.createdAt);
            console.log('  saleDate:', primera.saleDate);
            const fechaParseada = getSaleDate(primera);
            console.log('  Fecha parseada:', fechaParseada?.toLocaleDateString('es-MX'));
            console.log('  Fecha completa:', fechaParseada);
        }
        
        const countEl = document.getElementById('filteredSalesCount');
        if (countEl) {
            countEl.textContent = allSalesData.length;
        }
        
        const totalEl = document.getElementById('filteredSalesTotal');
        if (totalEl) {
            const total = allSalesData.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
            totalEl.textContent = `| Total: ${formatCurrency(total)}`;
        }
        
        renderSales(allSalesData);
        updateSalesSummary(allSalesData);
        
        // ✅ Asegurar que window.allSalesData esté actualizado después de renderizar
        window.allSalesData = allSalesData;
        
        console.log('✅ Ventas renderizadas correctamente. Total:', allSalesData.length);
        console.log('✅ window.allSalesData actualizado:', window.allSalesData?.length);
        
    } catch (error) {
        console.error('Error al cargar ventas:', error);
    }
};

// ============================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================

export const setCurrentUser = (user) => {
    currentUser = user;
};

// ============================================
// FUNCIÓN PARA OBTENER DATOS DE VENTAS (DIAGNÓSTICO)
// ============================================

export const getSalesData = () => allSalesData;

// ============================================
// REGISTRAR FUNCIONES DE FILTRO EN window
// ============================================

window.filterSalesByDate = filterSalesByDate;
window.clearSalesFilter = clearSalesFilter;
window.filterThisWeek = filterThisWeek;
window.filterThisMonth = filterThisMonth;