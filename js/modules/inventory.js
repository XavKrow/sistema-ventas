// ============================================
// GESTIÓN DE INVENTARIO
// ============================================

import { getProducts, saveProduct, saveInventoryMovement } from '../firebase-config.js';
import { formatCurrency, getCostPerPiece, showNotification } from './utils.js';

// ============================================
// VARIABLES
// ============================================

let allInventoryProducts = [];
let currentInventoryFilter = '';
let inventoryProductId = null;
let inventoryOperation = null;

// ============================================
// RENDERIZAR INVENTARIO CON FILTRO
// ============================================

export const renderInventory = (products) => {
    const container = document.getElementById('inventoryList');
    if (!container) return;
    
    allInventoryProducts = products || [];
    
    let filteredProducts = allInventoryProducts;
    if (currentInventoryFilter) {
        const searchTerm = currentInventoryFilter.toLowerCase().trim();
        filteredProducts = allInventoryProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    const countEl = document.getElementById('inventoryCount');
    if (countEl) {
        countEl.textContent = filteredProducts.length === allInventoryProducts.length 
            ? `📊 ${allInventoryProducts.length} productos` 
            : `📊 ${filteredProducts.length} de ${allInventoryProducts.length} productos`;
    }
    
    if (!filteredProducts || filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>${allInventoryProducts.length > 0 ? '🔍 No se encontraron productos' : '📊 No hay productos en inventario'}</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Tipo</th>
                        <th>Stock</th>
                        <th>Valor Inventario</th>
                        <th>Acciones</th>
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
            stockIcon = ' ⚠️';
        } else if (stock < 5) {
            stockClass = 'badge-low-stock';
            stockIcon = ' ⚡';
        }
        
        html += `
            <tr>
                <td>
                    <strong>${product.name}</strong>
                    ${stock <= 0 ? `<br><small style="color:#f56565;">🚫 AGOTADO</small>` : ''}
                    ${stock > 0 && stock < 5 ? `<br><small style="color:#ed8936;">📦 Stock bajo</small>` : ''}
                    ${product.type === 'batch' ? `<br><small style="color:var(--text-muted); font-size: 10px;">Lote: ${product.batchSize} uds | ${formatCurrency(costPerPiece)} / pieza</small>` : ''}
                </td>
                <td>
                    <span class="badge ${product.type === 'batch' ? 'badge-warning' : 'badge-info'}">
                        ${product.type === 'batch' ? `📦 Lote (${product.batchSize} uds)` : '🔹 Pieza'}
                    </span>
                </td>
                <td>
                    <span class="badge ${stockClass}" style="font-size: 1.1em;">${stock}${stockIcon}</span>
                </td>
                <td>
                    <strong style="color:#48bb78;">${formatCurrency(value)}</strong>
                    <br><small style="color:var(--text-muted); font-size: 10px;">
                        ${stock} × ${formatCurrency(costPerPiece)} = ${formatCurrency(value)}
                    </small>
                </td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="window.openInventoryModal('${product.id}', 'add')">➕</button>
                    <button class="btn btn-sm btn-danger" onclick="window.openInventoryModal('${product.id}', 'subtract')">➖</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
};

// ============================================
// FILTRAR INVENTARIO
// ============================================

export const filterInventory = (searchTerm) => {
    currentInventoryFilter = searchTerm;
    renderInventory(allInventoryProducts);
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
            showNotification('Producto no encontrado', 'error');
            return;
        }
        
        document.getElementById('inventoryProductName').textContent = `📦 ${product.name}`;
        document.getElementById('inventoryCurrentStock').textContent = product.stock || 0;
        document.getElementById('inventoryQuantity').value = 1;
        document.getElementById('inventoryMessage').textContent = '';
        document.getElementById('inventoryMessage').style.color = 'var(--text-primary)';
        
        const title = operation === 'add' ? '➕ Agregar Stock' : '➖ Restar Stock';
        document.getElementById('inventoryModalTitle').textContent = title;
        
        document.getElementById('inventoryModal').style.display = 'flex';
        document.getElementById('inventoryQuantity').focus();
        document.getElementById('inventoryQuantity').select();
    });
};

export const confirmInventoryAdjust = async () => {
    const quantity = parseInt(document.getElementById('inventoryQuantity').value);
    const messageEl = document.getElementById('inventoryMessage');
    
    if (isNaN(quantity) || quantity <= 0) {
        messageEl.textContent = '❌ Ingresa una cantidad válida';
        messageEl.style.color = '#f56565';
        return;
    }
    
    try {
        const products = await getProducts();
        const product = products.find(p => p.id === inventoryProductId);
        if (!product) {
            showNotification('Producto no encontrado', 'error');
            return;
        }
        
        const action = inventoryOperation === 'add' ? 'agregar' : 'restar';
        
        if (inventoryOperation === 'subtract' && (product.stock || 0) < quantity) {
            messageEl.textContent = `❌ Stock insuficiente (Stock actual: ${product.stock})`;
            messageEl.style.color = '#f56565';
            return;
        }
        
        product.stock = inventoryOperation === 'add' ? 
            (product.stock || 0) + quantity : 
            (product.stock || 0) - quantity;
        
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
        showNotification(`✅ Inventario actualizado (${action} ${quantity} unidades)`, 'success');
        
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