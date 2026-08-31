// ============================================
// GESTIÓN DE VENTAS
// ============================================

import { getProducts, getSales, saveSale, saveMultiSale, undoSale, saveInventoryMovement, listenSales } from '../firebase-config.js';
import { formatCurrency, roundToTwo, formatDate, showNotification, getPriceAsNumber, calculateSalePrice } from './utils.js';

// ============================================
// VARIABLES GLOBALES (de este módulo)
// ============================================

let saleItems = [];
let currentUser = null;

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
    
    salesOrdenadas.slice(0, 50).forEach(sale => {
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
    
    if (sales.length > 50) {
        html += `
            <tr>
                <td colspan="6" style="text-align:center; color:var(--text-muted);">
                    <i class="fas fa-info-circle"></i> Mostrando 50 de ${sales.length} ventas
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
        
    } catch (error) {
        messageEl.textContent = '❌ Error al registrar venta';
        messageEl.style.color = '#f56565';
    }
};

// ============================================
// DESHACER VENTA
// ============================================

export const undoSaleHandler = async (saleId) => {
    if (!confirm('¿Estás seguro de deshacer esta venta?\nSe devolverá el stock de todos los productos.')) return;
    
    try {
        await undoSale(saleId);
        showNotification('✅ Venta deshecha correctamente', 'success');
    } catch (error) {
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
// EXPORTAR FUNCIONES GLOBALES
// ============================================

export const setCurrentUser = (user) => {
    currentUser = user;
};