// ============================================
// GESTIÓN DE INVENTARIO
// ============================================

import { getProducts, saveProduct, saveInventoryMovement, getInventoryMovements } from '../firebase-config.js';
import { formatCurrency, getCostPerPiece, showNotification } from './utils.js';

// ============================================
// VARIABLES
// ============================================

let allInventoryProducts = [];
let currentInventoryFilter = '';
let currentStockFilter = 'all'; // 'all', 'inStock', 'lowStock', 'outOfStock'
let inventoryProductId = null;
let inventoryOperation = null;

// ============================================
// RENDERIZAR INVENTARIO CON FILTRO
// ============================================

export const renderInventory = (products) => {
    const container = document.getElementById('inventoryList');
    if (!container) return;
    
    allInventoryProducts = products || [];
    
    // Ordenar productos por nombre (alfabético)
    allInventoryProducts.sort((a, b) => a.name.localeCompare(b.name));
    
    let filteredProducts = allInventoryProducts;
    
    // Filtro por búsqueda
    if (currentInventoryFilter) {
        const searchTerm = currentInventoryFilter.toLowerCase().trim();
        filteredProducts = allInventoryProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtro por stock
    if (currentStockFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => {
            const stock = product.stock || 0;
            if (currentStockFilter === 'inStock') return stock > 0;
            if (currentStockFilter === 'lowStock') return stock > 0 && stock < 5;
            if (currentStockFilter === 'outOfStock') return stock === 0;
            return true;
        });
    }
    
    const countEl = document.getElementById('inventoryCount');
    if (countEl) {
        if (filteredProducts.length === allInventoryProducts.length && currentStockFilter === 'all') {
            countEl.innerHTML = `<i class="fas fa-boxes"></i> ${allInventoryProducts.length} productos`;
        } else {
            countEl.innerHTML = `<i class="fas fa-filter"></i> ${filteredProducts.length} de ${allInventoryProducts.length} productos`;
        }
    }
    
    if (!filteredProducts || filteredProducts.length === 0) {
        let message = '';
        
        if (allInventoryProducts.length === 0) {
            message = '<i class="fas fa-boxes"></i> No hay productos en inventario';
        } else if (currentInventoryFilter) {
            message = `<i class="fas fa-search"></i> No se encontraron productos con "<strong>${currentInventoryFilter}</strong>"`;
        } else if (currentStockFilter !== 'all') {
            const stockLabels = {
                'inStock': 'en stock',
                'lowStock': 'con stock bajo',
                'outOfStock': 'agotados'
            };
            message = `<i class="fas fa-warehouse"></i> No hay productos ${stockLabels[currentStockFilter] || 'con este filtro'}`;
        } else {
            message = '<i class="fas fa-boxes"></i> No hay productos que coincidan con los filtros';
        }
        
        container.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
                ${currentInventoryFilter || currentStockFilter !== 'all' ? `<button onclick="window.clearInventoryFilters()" class="btn btn-secondary"><i class="fas fa-undo"></i> Limpiar filtros</button>` : ''}
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-tag"></i> Producto</th>
                        <th><i class="fas fa-box"></i> Tipo</th>
                        <th><i class="fas fa-warehouse"></i> Stock</th>
                        <th><i class="fas fa-dollar-sign"></i> Valor Inventario</th>
                        <th><i class="fas fa-cogs"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    filteredProducts.forEach(product => {
        const stock = product.stock || 0;
        const costPerPiece = getCostPerPiece(product);
        const value = stock * costPerPiece;
        
        let stockClass = '';
        let stockIcon = '';
        if (stock <= 0) {
            stockClass = 'badge-out-of-stock';
            stockIcon = ' <i class="fas fa-exclamation-circle"></i>';
        } else if (stock < 5) {
            stockClass = 'badge-low-stock';
            stockIcon = ' <i class="fas fa-bolt"></i>';
        }
        
        html += `
            <tr>
                <td>
                    <strong>${product.name}</strong>
                    ${stock <= 0 ? `<br><small style="color:#f56565;"><i class="fas fa-ban"></i> AGOTADO</small>` : ''}
                    ${stock > 0 && stock < 5 ? `<br><small style="color:#ed8936;"><i class="fas fa-exclamation-triangle"></i> Stock bajo</small>` : ''}
                    ${product.type === 'batch' ? `<br><small style="color:var(--text-muted); font-size: 10px;"><i class="fas fa-cubes"></i> Lote: ${product.batchSize} uds | ${formatCurrency(costPerPiece)} / pieza</small>` : ''}
                </td>
                <td>
                    <span class="badge ${product.type === 'batch' ? 'badge-warning' : 'badge-info'}">
                        ${product.type === 'batch' ? `<i class="fas fa-boxes"></i> Lote (${product.batchSize} uds)` : '<i class="fas fa-cube"></i> Pieza'}
                    </span>
                </td>
                <td>
                    <span class="badge ${stockClass}" style="font-size: 1.1em;">${stock}${stockIcon}</span>
                </td>
                <td>
                    <strong style="color:#48bb78;"><i class="fas fa-dollar-sign"></i> ${formatCurrency(value)}</strong>
                    <br><small style="color:var(--text-muted); font-size: 10px;">
                        <i class="fas fa-calculator"></i> ${stock} × ${formatCurrency(costPerPiece)} = ${formatCurrency(value)}
                    </small>
                </td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="window.openInventoryModal('${product.id}', 'add')" title="Agregar stock">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.openInventoryModal('${product.id}', 'subtract')" title="Restar stock">
                        <i class="fas fa-minus"></i>
                    </button>
                    <button class="btn btn-sm btn-info" onclick="window.viewInventoryHistory('${product.id}')" title="Ver historial" style="background: #667eea; color: #fff;">
                        <i class="fas fa-history"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    
    // Actualizar resumen después de renderizar
    updateInventorySummary(filteredProducts);
};

// ============================================
// FILTRAR INVENTARIO
// ============================================

export const filterInventory = (searchTerm) => {
    currentInventoryFilter = searchTerm;
    renderInventory(allInventoryProducts);
};

export const filterInventoryByStock = (filter) => {
    currentStockFilter = filter;
    renderInventory(allInventoryProducts);
};

export const clearInventoryFilters = () => {
    currentInventoryFilter = '';
    currentStockFilter = 'all';
    const searchInput = document.getElementById('searchInventory');
    if (searchInput) searchInput.value = '';
    renderInventory(allInventoryProducts);
};

// ============================================
// RESUMEN DE INVENTARIO
// ============================================

export const updateInventorySummary = (products) => {
    const container = document.getElementById('inventorySummary');
    if (!container) return;
    
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * getCostPerPiece(p)), 0);
    const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;
    const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
    
    container.innerHTML = `
        <div class="inventory-summary" style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 15px; margin: 15px 0; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
            <div class="summary-item" style="text-align: center;">
                <span style="color: var(--text-muted); font-size: 12px; display: block;"><i class="fas fa-box"></i> Total Productos</span>
                <p style="font-size: 20px; font-weight: bold; margin: 5px 0 0 0; color: var(--text-primary);">${totalProducts}</p>
            </div>
            <div class="summary-item" style="text-align: center;">
                <span style="color: var(--text-muted); font-size: 12px; display: block;"><i class="fas fa-warehouse"></i> Total Unidades</span>
                <p style="font-size: 20px; font-weight: bold; margin: 5px 0 0 0; color: var(--text-primary);">${totalStock}</p>
            </div>
            <div class="summary-item" style="text-align: center;">
                <span style="color: var(--text-muted); font-size: 12px; display: block;"><i class="fas fa-dollar-sign"></i> Valor Inventario</span>
                <p style="font-size: 20px; font-weight: bold; margin: 5px 0 0 0; color: #48bb78;">${formatCurrency(totalValue)}</p>
            </div>
            <div class="summary-item" style="text-align: center;">
                <span style="color: var(--text-muted); font-size: 12px; display: block;"><i class="fas fa-exclamation-triangle"></i> Stock Bajo</span>
                <p style="font-size: 20px; font-weight: bold; margin: 5px 0 0 0; color: #ed8936;">${lowStock}</p>
            </div>
            <div class="summary-item" style="text-align: center;">
                <span style="color: var(--text-muted); font-size: 12px; display: block;"><i class="fas fa-times-circle"></i> Agotados</span>
                <p style="font-size: 20px; font-weight: bold; margin: 5px 0 0 0; color: #f56565;">${outOfStock}</p>
            </div>
        </div>
    `;
};

// ============================================
// EXPORTAR INVENTARIO A CSV
// ============================================

export const exportInventoryToCSV = () => {
    if (!allInventoryProducts || allInventoryProducts.length === 0) {
        showNotification('❌ No hay inventario para exportar', 'error');
        return;
    }
    
    if (window.exportToCSV) {
        const headers = ['Producto', 'Tipo', 'Stock', 'Costo Unitario', 'Valor Total', 'Estado'];
        const data = allInventoryProducts.map(p => {
            const stock = p.stock || 0;
            const costPerPiece = getCostPerPiece(p);
            let estado = 'En stock';
            if (stock <= 0) estado = 'Agotado';
            else if (stock < 5) estado = 'Stock bajo';
            
            return {
                'Producto': p.name,
                'Tipo': p.type === 'batch' ? `Lote (${p.batchSize} uds)` : 'Pieza',
                'Stock': stock,
                'Costo Unitario': costPerPiece,
                'Valor Total': stock * costPerPiece,
                'Estado': estado
            };
        });
        window.exportToCSV(data, `inventario_${new Date().toISOString().slice(0,10)}`, headers);
    } else {
        showNotification('❌ Módulo de exportación no disponible', 'error');
    }
};

// ============================================
// ACCIONES DE INVENTARIO
// ============================================

export const openInventoryModal = (productId, operation) => {
    inventoryProductId = productId;
    inventoryOperation = operation;
    
    getProducts().then(products => {
        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('❌ Producto no encontrado', 'error');
            return;
        }
        
        document.getElementById('inventoryProductName').innerHTML = `<i class="fas fa-box"></i> ${product.name}`;
        document.getElementById('inventoryCurrentStock').textContent = product.stock || 0;
        document.getElementById('inventoryQuantity').value = 1;
        document.getElementById('inventoryMessage').textContent = '';
        document.getElementById('inventoryMessage').style.color = 'var(--text-primary)';
        
        const title = operation === 'add' 
            ? '<i class="fas fa-plus"></i> Agregar Stock' 
            : '<i class="fas fa-minus"></i> Restar Stock';
        document.getElementById('inventoryModalTitle').innerHTML = title;
        
        const infoEl = document.getElementById('inventoryExtraInfo');
        if (infoEl) {
            infoEl.innerHTML = `
                <small style="color: var(--text-muted);">
                    <i class="fas fa-info-circle"></i> 
                    ${operation === 'add' ? 'Aumentarás el stock disponible' : 'Disminuirás el stock disponible'}
                    ${operation === 'subtract' ? ' (No se permite stock negativo)' : ''}
                </small>
            `;
        }
        
        document.getElementById('inventoryModal').style.display = 'flex';
        document.getElementById('inventoryQuantity').focus();
        document.getElementById('inventoryQuantity').select();
    });
};

export const confirmInventoryAdjust = async () => {
    const quantity = parseInt(document.getElementById('inventoryQuantity').value);
    const messageEl = document.getElementById('inventoryMessage');
    
    if (isNaN(quantity) || quantity <= 0) {
        messageEl.textContent = '❌ Ingresa una cantidad válida (mayor a 0)';
        messageEl.style.color = '#f56565';
        return;
    }
    
    try {
        const products = await getProducts();
        const product = products.find(p => p.id === inventoryProductId);
        if (!product) {
            showNotification('❌ Producto no encontrado', 'error');
            return;
        }
        
        const action = inventoryOperation === 'add' ? 'agregar' : 'restar';
        const actionEmoji = inventoryOperation === 'add' ? '➕' : '➖';
        
        if (inventoryOperation === 'subtract' && (product.stock || 0) < quantity) {
            messageEl.textContent = `❌ Stock insuficiente (Stock actual: ${product.stock || 0})`;
            messageEl.style.color = '#f56565';
            return;
        }
        
        if (quantity > 10) {
            if (!confirm(`⚠️ ¿Estás seguro de ${action} ${quantity} unidades de "${product.name}"?\nStock actual: ${product.stock || 0} unidades`)) {
                return;
            }
        }
        
        const oldStock = product.stock || 0;
        product.stock = inventoryOperation === 'add' ? 
            oldStock + quantity : 
            oldStock - quantity;
        
        await saveProduct(product, product.id);
        
        await saveInventoryMovement({
            productId: product.id,
            productName: product.name,
            quantity: quantity,
            operation: inventoryOperation,
            timestamp: new Date().toISOString(),
            user: window.currentUser?.email || 'Sistema'
        });
        
        document.getElementById('inventoryModal').style.display = 'none';
        showNotification(`✅ ${actionEmoji} Inventario actualizado: ${product.name} (${oldStock} → ${product.stock})`, 'success');
        
        const updatedProducts = await getProducts();
        renderInventory(updatedProducts);
        
    } catch (error) {
        console.error(error);
        messageEl.textContent = '❌ Error al ajustar inventario';
        messageEl.style.color = '#f56565';
    }
};

export const closeInventoryModal = () => {
    document.getElementById('inventoryModal').style.display = 'none';
    inventoryProductId = null;
    inventoryOperation = null;
};

// ============================================
// VER HISTORIAL DE MOVIMIENTOS (MODAL)
// ============================================

export const viewInventoryHistory = async (productId) => {
    try {
        const movements = await getInventoryMovements();
        const productMovements = movements.filter(m => m.productId === productId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        if (productMovements.length === 0) {
            showNotification('📋 No hay movimientos para este producto', 'info');
            return;
        }
        
        const product = allInventoryProducts.find(p => p.id === productId);
        const productName = product ? product.name : 'Producto';
        const stockActual = product ? product.stock || 0 : 0;
        
        const totalAgregados = productMovements.filter(m => m.operation === 'add').reduce((sum, m) => sum + m.quantity, 0);
        const totalRestados = productMovements.filter(m => m.operation === 'subtract' || m.operation === 'undo_sale').reduce((sum, m) => sum + m.quantity, 0);
        
        let html = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: var(--text-muted);"><i class="fas fa-box"></i> Producto</div>
                    <div style="font-size: 16px; font-weight: bold; color: var(--text-primary);">${productName}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: var(--text-muted);"><i class="fas fa-warehouse"></i> Stock Actual</div>
                    <div style="font-size: 16px; font-weight: bold; color: ${stockActual <= 0 ? '#f56565' : '#48bb78'};">${stockActual}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: var(--text-muted);"><i class="fas fa-plus-circle" style="color: #48bb78;"></i> Agregados</div>
                    <div style="font-size: 16px; font-weight: bold; color: #48bb78;">+${totalAgregados}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 12px; color: var(--text-muted);"><i class="fas fa-minus-circle" style="color: #f56565;"></i> Restados</div>
                    <div style="font-size: 16px; font-weight: bold; color: #f56565;">-${totalRestados}</div>
                </div>
            </div>
            
            <div class="table-responsive" style="max-height: 350px; overflow-y: auto;">
                <table style="font-size: 13px;">
                    <thead style="position: sticky; top: 0; z-index: 1;">
                        <tr>
                            <th><i class="fas fa-calendar-alt"></i> Fecha</th>
                            <th><i class="fas fa-exchange-alt"></i> Operación</th>
                            <th><i class="fas fa-hashtag"></i> Cantidad</th>
                            <th><i class="fas fa-user"></i> Usuario</th>
                            <th><i class="fas fa-info-circle"></i> Nota</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (productMovements.length === 0) {
            html += `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        <i class="fas fa-box-open"></i> No hay movimientos registrados
                    </td>
                </tr>
            `;
        } else {
            productMovements.forEach(m => {
                const fecha = new Date(m.timestamp).toLocaleString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                let operacion = '';
                let operacionColor = '';
                let operacionIcon = '';
                
                if (m.operation === 'add') {
                    operacion = 'Agregar';
                    operacionColor = '#48bb78';
                    operacionIcon = '➕';
                } else if (m.operation === 'undo_sale') {
                    operacion = 'Deshacer Venta';
                    operacionColor = '#667eea';
                    operacionIcon = '↩️';
                } else {
                    operacion = 'Restar';
                    operacionColor = '#f56565';
                    operacionIcon = '➖';
                }
                
                const cantidad = m.quantity;
                const usuario = m.user || 'Sistema';
                const nota = m.note || '';
                
                html += `
                    <tr>
                        <td><small>${fecha}</small></td>
                        <td>
                            <span style="color: ${operacionColor}; font-weight: 600;">
                                ${operacionIcon} ${operacion}
                            </span>
                        </td>
                        <td style="font-weight: 600; color: ${operacionColor};">${cantidad}</td>
                        <td><small>${usuario}</small></td>
                        <td><small style="color: var(--text-muted);">${nota}</small></td>
                    </tr>
                `;
            });
        }
        
        html += `
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <button onclick="window.closeHistoryModal()" class="btn btn-primary" style="background: #667eea; color: #fff;">
                    <i class="fas fa-times"></i> Cerrar
                </button>
            </div>
        `;
        
        document.getElementById('historyContent').innerHTML = html;
        document.getElementById('historyModal').style.display = 'flex';
        document.getElementById('historyModal').style.alignItems = 'center';
        document.getElementById('historyModal').style.justifyContent = 'center';
        
    } catch (error) {
        console.error('Error al obtener historial:', error);
        showNotification('❌ Error al cargar historial', 'error');
    }
};

// ============================================
// CERRAR MODAL DE HISTORIAL
// ============================================

export const closeHistoryModal = () => {
    document.getElementById('historyModal').style.display = 'none';
};

// ============================================
// REGISTRAR FUNCIONES EN window
// ============================================

window.filterInventory = filterInventory;
window.filterInventoryByStock = filterInventoryByStock;
window.clearInventoryFilters = clearInventoryFilters;
window.openInventoryModal = openInventoryModal;
window.confirmInventoryAdjust = confirmInventoryAdjust;
window.closeInventoryModal = closeInventoryModal;
window.viewInventoryHistory = viewInventoryHistory;
window.closeHistoryModal = closeHistoryModal;
window.exportInventoryToCSV = exportInventoryToCSV;