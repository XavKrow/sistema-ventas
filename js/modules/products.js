// ============================================
// GESTIÓN DE PRODUCTOS
// ============================================

import { getProducts, saveProduct, deleteProduct } from '../firebase-config.js';
import { formatCurrency, roundToTwo, showNotification, getPriceAsNumber, calculateSalePrice } from './utils.js';

// ============================================
// VARIABLES
// ============================================

let allProducts = [];
let currentFilter = '';
let currentCategoryFilter = '';
let currentStockFilter = 'all'; // 'all', 'inStock', 'lowStock', 'outOfStock'

// ============================================
// RENDERIZAR PRODUCTOS CON FILTRO
// ============================================

export const renderProducts = (products) => {
    const container = document.getElementById('productList');
    if (!container) return;
    
    allProducts = products || [];
    
    // ✅ Ordenar productos por nombre (alfabético)
    allProducts.sort((a, b) => a.name.localeCompare(b.name));
    
    let filteredProducts = allProducts;
    
    // Filtro por búsqueda
    if (currentFilter) {
        const searchTerm = currentFilter.toLowerCase().trim();
        filteredProducts = filteredProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.description && product.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Filtro por categoría
    if (currentCategoryFilter) {
        filteredProducts = filteredProducts.filter(product => 
            product.categoria === currentCategoryFilter
        );
    }
    
    // ✅ Filtro por stock
    if (currentStockFilter !== 'all') {
        filteredProducts = filteredProducts.filter(product => {
            const stock = product.stock || 0;
            if (currentStockFilter === 'inStock') return stock > 0;
            if (currentStockFilter === 'lowStock') return stock > 0 && stock < 5;
            if (currentStockFilter === 'outOfStock') return stock === 0;
            return true;
        });
    }
    
    const countEl = document.getElementById('productCount');
    if (countEl) {
        const totalProductos = allProducts.length;
        const mostrados = filteredProducts.length;
        if (currentFilter || currentCategoryFilter || currentStockFilter !== 'all') {
            countEl.innerHTML = `<i class="fas fa-filter"></i> ${mostrados} de ${totalProductos} productos`;
        } else {
            countEl.innerHTML = `<i class="fas fa-box"></i> ${totalProductos} productos`;
        }
    }
    
    if (!filteredProducts || filteredProducts.length === 0) {
        let message = '';
        let button = '';
        
        if (allProducts.length === 0) {
            message = '<i class="fas fa-box-open"></i> No hay productos registrados';
            button = `<button onclick="window.openAddProduct()" class="btn btn-primary"><i class="fas fa-plus"></i> Agregar Producto</button>`;
        } else if (currentFilter) {
            message = `<i class="fas fa-search"></i> No se encontraron productos con "<strong>${currentFilter}</strong>"`;
            button = `<button onclick="window.filterProducts('')" class="btn btn-secondary"><i class="fas fa-undo"></i> Limpiar búsqueda</button>`;
        } else if (currentCategoryFilter) {
            message = `<i class="fas fa-folder"></i> No hay productos en la categoría "<strong>${currentCategoryFilter}</strong>"`;
            button = `<button onclick="window.filterByCategory('')" class="btn btn-secondary"><i class="fas fa-undo"></i> Ver todas</button>`;
        } else if (currentStockFilter !== 'all') {
            const stockLabels = {
                'inStock': 'en stock',
                'lowStock': 'con stock bajo',
                'outOfStock': 'agotados'
            };
            message = `<i class="fas fa-warehouse"></i> No hay productos ${stockLabels[currentStockFilter] || 'con este filtro'}`;
            button = `<button onclick="window.filterByStock('all')" class="btn btn-secondary"><i class="fas fa-undo"></i> Ver todos</button>`;
        } else {
            message = '<i class="fas fa-box-open"></i> No hay productos que coincidan con los filtros';
        }
        
        container.innerHTML = `
            <div class="empty-state">
                <p>${message}</p>
                ${button}
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
                        <th><i class="fas fa-folder"></i> Categoría</th>
                        <th><i class="fas fa-box"></i> Tipo</th>
                        <th><i class="fas fa-dollar-sign"></i> Costo</th>
                        <th><i class="fas fa-tag"></i> Precio Venta</th>
                        <th><i class="fas fa-warehouse"></i> Stock</th>
                        <th><i class="fas fa-cogs"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    filteredProducts.forEach(product => {
        let price = getPriceAsNumber(product);
        if (!price || isNaN(price) || price <= 0) {
            price = calculateSalePrice(product.cost, product.type, product.batchSize);
        }
        
        const stock = product.stock || 0;
        
        let stockClass = 'badge-in-stock';
        let stockIcon = '';
        let stockLabel = stock;
        
        if (stock <= 0) {
            stockClass = 'badge-out-of-stock';
            stockIcon = ' <i class="fas fa-exclamation-circle"></i>';
            stockLabel = '0';
        } else if (stock < 5) {
            stockClass = 'badge-low-stock';
            stockIcon = ' <i class="fas fa-bolt"></i>';
        }
        
        const priceLabel = product.priceStr ? '<i class="fas fa-user-edit"></i> Personalizado' : '<i class="fas fa-lightbulb"></i> Sugerido';
        
        let costDisplay = formatCurrency(product.cost);
        if (product.type === 'batch' && product.batchSize) {
            const costPerPiece = roundToTwo(product.cost / product.batchSize);
            costDisplay += `<br><small style="color:var(--text-muted); font-size: 10px;"><i class="fas fa-cubes"></i> ${formatCurrency(costPerPiece)} / pieza</small>`;
        }
        
        const nameWarning = stock <= 0 ? ' <i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>' : '';
        const categoriaDisplay = product.categoria 
            ? `<span class="badge badge-info" style="font-size: 10px;"><i class="fas fa-folder"></i> ${product.categoria}</span>`
            : `<span class="badge" style="font-size: 10px; background: var(--bg-secondary); color: var(--text-muted);"><i class="fas fa-times"></i> Sin categoría</span>`;
        
        html += `
            <tr>
                <td>
                    <strong>${product.name}${nameWarning}</strong>
                    ${product.description ? `<br><small style="color:var(--text-muted);">${product.description}</small>` : ''}
                    ${stock <= 0 ? `<br><small style="color:#f56565; font-weight: bold;"><i class="fas fa-ban"></i> AGOTADO</small>` : ''}
                    ${stock > 0 && stock < 5 ? `<br><small style="color:#ed8936;"><i class="fas fa-exclamation-triangle"></i> Stock bajo (${stock} uds)</small>` : ''}
                </td>
                <td>${categoriaDisplay}</td>
                <td>
                    <span class="badge ${product.type === 'batch' ? 'badge-warning' : 'badge-info'}">
                        ${product.type === 'batch' ? `<i class="fas fa-boxes"></i> Lote (${product.batchSize} uds)` : '<i class="fas fa-cube"></i> Pieza'}
                    </span>
                </td>
                <td>${costDisplay}</td>
                <td>
                    <strong style="color:#48bb78;">${formatCurrency(price)}</strong>
                    <br><small style="color:var(--text-muted); font-size: 10px;">${priceLabel}</small>
                </td>
                <td>
                    <span class="badge ${stockClass}">${stockLabel}${stockIcon}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteProductHandler('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
};

// ============================================
// FILTRAR PRODUCTOS
// ============================================

export const filterProducts = (searchTerm) => {
    currentFilter = searchTerm;
    renderProducts(allProducts);
};

export const filterByCategory = (category) => {
    currentCategoryFilter = category;
    renderProducts(allProducts);
};

// ✅ NUEVO: Filtrar por stock
export const filterByStock = (filter) => {
    currentStockFilter = filter;
    renderProducts(allProducts);
};

// ============================================
// ACTUALIZAR PRECIO SUGERIDO
// ============================================

export const updateSalePrice = () => {
    const cost = parseFloat(document.getElementById('prodCost').value);
    const type = document.getElementById('prodType').value;
    const batchSize = parseInt(document.getElementById('prodBatchSize').value);
    const priceInput = document.getElementById('prodPrice');
    const priceContainer = document.getElementById('prodPriceContainer');
    
    if (!priceInput) return;
    
    if (cost && cost > 0) {
        let suggestedPrice = calculateSalePrice(cost, type, batchSize);
        priceInput.value = suggestedPrice;
        priceInput.style.borderColor = '#667eea';
        
        const detail = priceContainer?.querySelector('small');
        if (detail) {
            const costPerPiece = type === 'batch' && batchSize > 0 ? roundToTwo(cost / batchSize) : cost;
            detail.innerHTML = type === 'batch' && batchSize > 0
                ? `<i class="fas fa-cubes"></i> Costo por pieza: ${formatCurrency(costPerPiece)} × 1.35 = ${formatCurrency(suggestedPrice)}`
                : `<i class="fas fa-calculator"></i> Costo: ${formatCurrency(cost)} × 1.35 = ${formatCurrency(suggestedPrice)}`;
        }
    } else {
        priceInput.value = '0.00';
        priceInput.style.borderColor = 'var(--border-color)';
        
        const detail = priceContainer?.querySelector('small');
        if (detail) {
            detail.innerHTML = '<i class="fas fa-lightbulb"></i> Ingresa el <strong>costo</strong> para ver el precio sugerido';
        }
    }
};

// ============================================
// APLICAR PRECIO SUGERIDO
// ============================================

export const applySuggestedPrice = () => {
    const cost = parseFloat(document.getElementById('prodCost').value);
    const type = document.getElementById('prodType').value;
    const batchSize = parseInt(document.getElementById('prodBatchSize').value);
    const priceInput = document.getElementById('prodPrice');
    
    if (!priceInput) {
        showNotification('❌ Campo de precio no encontrado', 'error');
        return;
    }
    
    if (cost && cost > 0) {
        const suggestedPrice = calculateSalePrice(cost, type, batchSize);
        priceInput.value = suggestedPrice;
        showNotification(`<i class="fas fa-magic"></i> Precio sugerido aplicado: ${formatCurrency(suggestedPrice)}`, 'success');
    } else {
        showNotification('❌ Ingresa el costo primero', 'error');
    }
};

// ============================================
// ACCIONES DE PRODUCTOS
// ============================================

export const openAddProduct = () => {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus"></i> Agregar Producto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('prodType').value = 'unit';
    document.querySelector('.batch-fields').style.display = 'none';
    document.getElementById('productModal').style.display = 'flex';
    
    const priceInput = document.getElementById('prodPrice');
    if (priceInput) {
        priceInput.value = '0.00';
        priceInput.style.borderColor = 'var(--border-color)';
    }
    
    const priceContainer = document.getElementById('prodPriceContainer');
    const detail = priceContainer?.querySelector('small');
    if (detail) {
        detail.innerHTML = '<i class="fas fa-lightbulb"></i> Ingresa el <strong>costo</strong> para ver el precio sugerido';
    }
};

export const editProduct = async (id) => {
    try {
        const products = await getProducts();
        const product = products.find(p => p.id === id);
        
        if (!product) {
            showNotification('❌ Producto no encontrado', 'error');
            return;
        }
        
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Producto';
        document.getElementById('productId').value = product.id;
        document.getElementById('prodName').value = product.name;
        document.getElementById('prodDescription').value = product.description || '';
        document.getElementById('prodCategory').value = product.categoria || '';
        document.getElementById('prodType').value = product.type;
        document.getElementById('prodBatchSize').value = product.batchSize || '';
        document.getElementById('prodCost').value = product.cost;
        document.getElementById('prodStock').value = product.stock || 0;
        
        const isBatch = product.type === 'batch';
        document.querySelector('.batch-fields').style.display = isBatch ? 'block' : 'none';
        
        let price = getPriceAsNumber(product);
        if (!price || isNaN(price) || price <= 0) {
            price = calculateSalePrice(product.cost, product.type, product.batchSize);
        }
        
        const priceInput = document.getElementById('prodPrice');
        if (priceInput) {
            priceInput.value = price;
        }
        
        const priceContainer = document.getElementById('prodPriceContainer');
        const detail = priceContainer?.querySelector('small');
        if (detail) {
            const costPerPiece = isBatch && product.batchSize ? roundToTwo(product.cost / product.batchSize) : product.cost;
            detail.innerHTML = isBatch && product.batchSize
                ? `<i class="fas fa-cubes"></i> Costo por pieza: ${formatCurrency(costPerPiece)} × 1.35 = ${formatCurrency(price)}`
                : `<i class="fas fa-calculator"></i> Costo: ${formatCurrency(product.cost)} × 1.35 = ${formatCurrency(price)}`;
        }
        
        document.getElementById('productModal').style.display = 'flex';
    } catch (error) {
        showNotification('❌ Error al cargar producto', 'error');
    }
};

export const deleteProductHandler = async (id) => {
    // ✅ Verificar si el producto tiene stock antes de eliminar
    const product = allProducts.find(p => p.id === id);
    if (product && (product.stock || 0) > 0) {
        if (!confirm(`⚠️ El producto "${product.name}" tiene ${product.stock} unidades en stock.\n¿Estás seguro de eliminarlo?`)) {
            return;
        }
    }
    
    if (!confirm('¿Estás seguro de eliminar este producto?\nEsta acción no se puede deshacer.')) return;
    
    try {
        await deleteProduct(id);
        showNotification('✅ Producto eliminado correctamente', 'success');
        
        // ✅ Recargar lista de productos después de eliminar
        const products = await getProducts();
        renderProducts(products);
        
    } catch (error) {
        showNotification('❌ Error al eliminar producto', 'error');
    }
};

// ============================================
// EXPORTAR PRODUCTOS A CSV
// ============================================

export const exportProductsToCSV = () => {
    if (!allProducts || allProducts.length === 0) {
        showNotification('❌ No hay productos para exportar', 'error');
        return;
    }
    
    // Usar la función global de exportación si existe
    if (window.exportToCSV) {
        const headers = ['Producto', 'Categoría', 'Tipo', 'Costo', 'Precio Venta', 'Stock', 'Valor Inventario'];
        const data = allProducts.map(p => ({
            'Producto': p.name,
            'Categoría': p.categoria || 'Sin categoría',
            'Tipo': p.type === 'batch' ? `Lote (${p.batchSize} uds)` : 'Pieza',
            'Costo': p.cost || 0,
            'Precio Venta': getPriceAsNumber(p) || 0,
            'Stock': p.stock || 0,
            'Valor Inventario': (p.stock || 0) * (p.type === 'batch' && p.batchSize ? roundToTwo(p.cost / p.batchSize) : p.cost)
        }));
        window.exportToCSV(data, `productos_${new Date().toISOString().slice(0,10)}`, headers);
    } else {
        showNotification('❌ Módulo de exportación no disponible', 'error');
    }
};

// ============================================
// REGISTRAR FUNCIONES EN window
// ============================================

window.filterProducts = filterProducts;
window.filterByCategory = filterByCategory;
window.filterByStock = filterByStock;
window.exportProductsToCSV = exportProductsToCSV;