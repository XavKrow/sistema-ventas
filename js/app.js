// ============================================
// PUNTO DE ENTRADA DE LA APLICACIÓN
// ============================================

import { 
    loginUser, 
    logoutUser, 
    onAuthChange, 
    getProducts, 
    getSales, 
    listenProducts, 
    listenSales, 
    saveProduct,
    listenCategories,
    saveCategory,
    getCategories
} from './firebase-config.js';

import { renderProducts, openAddProduct, editProduct, deleteProductHandler, updateSalePrice, applySuggestedPrice, filterProducts, filterByCategory } from './modules/products.js';
import { renderInventory, openInventoryModal, confirmInventoryAdjust, closeInventoryModal, filterInventory, viewInventoryHistory, closeHistoryModal } from './modules/inventory.js';
import { renderSales, registerSale, loadProductPrice, calculateSaleTotal, updateSaleProducts, openMultiSaleModal, addItemToSale, removeItemFromSale, confirmMultiSale, undoSaleHandler, updateSalesSummary, setCurrentUser as setSalesUser, loadSales } from './modules/sales.js';
import { updateFinancialPanel, openWithdrawModal, confirmWithdraw, undoWithdrawalHandler, setCurrentUser as setFinancesUser } from './modules/finances.js';
import { setupTabs } from './modules/ui.js';
import { showNotification, roundToTwo } from './modules/utils.js';
import { updateStats } from './modules/stats.js';
import { renderCategories, openAddCategory, editCategory, deleteCategoryHandler, updateCategories, renderCategoryOptions } from './modules/categories.js';

// ✅ IMPORTAR MÓDULO DE EXPORTACIÓN
import './modules/export.js';
// ✅ O IMPORTAR FUNCIONES ESPECÍFICAS
import { 
    printToPDF,
    exportProductsToCSV,
    exportInventoryToCSV,
    exportSalesToCSV,
    exportFinancesToCSV,
    exportToCSV
} from './modules/export.js';

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentUser = null;
let productsUnsubscribe = null;
let salesUnsubscribe = null;
let categoriesUnsubscribe = null;

window.currentUser = null;

// ============================================
// FUNCIONES GLOBALES (para window)
// ============================================

// === Funciones de Productos ===
window.openAddProduct = openAddProduct;
window.editProduct = editProduct;
window.deleteProductHandler = deleteProductHandler;
window.applySuggestedPrice = applySuggestedPrice;
window.updateSalePrice = updateSalePrice;
window.filterByCategory = filterByCategory;

// === Funciones de Inventario ===
window.openInventoryModal = openInventoryModal;
window.confirmInventoryAdjust = confirmInventoryAdjust;
window.closeInventoryModal = closeInventoryModal;
window.viewInventoryHistory = viewInventoryHistory;
window.closeHistoryModal = closeHistoryModal;

// === Funciones de Ventas ===
window.registerSale = registerSale;
window.calculateSaleTotal = calculateSaleTotal;
window.loadProductPrice = loadProductPrice;
window.openMultiSaleModal = openMultiSaleModal;
window.addItemToSale = addItemToSale;
window.removeItemFromSale = removeItemFromSale;
window.confirmMultiSale = confirmMultiSale;
window.undoSaleHandler = undoSaleHandler;

// === Funciones de Finanzas ===
window.openWithdrawModal = openWithdrawModal;
window.confirmWithdraw = confirmWithdraw;
window.undoWithdrawalHandler = undoWithdrawalHandler;

// === Funciones de Estadísticas ===
window.updateStats = updateStats;

// === Funciones de Categorías ===
window.openAddCategory = openAddCategory;
window.editCategory = editCategory;
window.deleteCategoryHandler = deleteCategoryHandler;
window.updateCategories = updateCategories;

// ✅ FUNCIONES DE EXPORTACIÓN (PDF y CSV)
window.printToPDF = printToPDF;
window.exportProductsToCSV = exportProductsToCSV;
window.exportInventoryToCSV = exportInventoryToCSV;
window.exportSalesToCSV = exportSalesToCSV;
window.exportFinancesToCSV = exportFinancesToCSV;
window.exportToCSV = exportToCSV;

// ============================================
// INICIALIZACIÓN
// ============================================

const initApp = () => {
    onAuthChange(async (user) => {
        if (user) {
            currentUser = user;
            window.currentUser = user;
            setSalesUser(user);
            setFinancesUser(user);
            
            document.getElementById('userName').textContent = `👤 ${user.email}`;
            
            try {
                const products = await getProducts();
                window.allProducts = products;
                renderProducts(products);
                renderInventory(products);
                await updateSaleProducts(products);
                
                // ✅ USAR loadSales() en lugar de getSales()
                await loadSales();
                await updateFinancialPanel();
                
                await updateStats();
                await updateCategories();
                
            } catch (error) {
                console.error('Error al cargar datos iniciales:', error);
                showNotification('Error al cargar datos', 'error');
            }
            
            if (productsUnsubscribe) productsUnsubscribe();
            productsUnsubscribe = listenProducts(async (updatedProducts) => {
                window.allProducts = updatedProducts;
                renderProducts(updatedProducts);
                renderInventory(updatedProducts);
                await updateSaleProducts(updatedProducts);
                await updateStats();
                const categories = await getCategories();
                renderCategories(categories);
            });
            
            if (salesUnsubscribe) salesUnsubscribe();
            salesUnsubscribe = listenSales(async (updatedSales) => {
                // ✅ Actualizar allSalesData cuando hay cambios
                const { loadSales } = await import('./modules/sales.js');
                await loadSales();
                await updateFinancialPanel();
                await updateStats();
            });
            
            if (categoriesUnsubscribe) categoriesUnsubscribe();
            categoriesUnsubscribe = listenCategories(async (updatedCategories) => {
                renderCategories(updatedCategories);
                renderCategoryOptions(updatedCategories);
            });
            
        } else {
            window.location.href = 'login.html';
        }
    });
};

// ============================================
// EVENTOS DEL DOM
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupTabs();
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await logoutUser();
            window.location.href = 'login.html';
        } catch (error) {
            showNotification('Error al cerrar sesión', 'error');
        }
    });
    
    // Ventas simples
    document.getElementById('registerSaleBtn')?.addEventListener('click', registerSale);
    document.getElementById('saleQuantity')?.addEventListener('input', calculateSaleTotal);
    document.getElementById('salePrice')?.addEventListener('input', calculateSaleTotal);
    document.getElementById('saleProduct')?.addEventListener('change', loadProductPrice);
    
    document.getElementById('saleQuantity')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('salePrice').focus();
    });
    document.getElementById('salePrice')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('registerSaleBtn').click();
    });
    
    // 🔍 BÚSQUEDA EN PRODUCTOS
    const searchProducts = document.getElementById('searchProducts');
    if (searchProducts) {
        searchProducts.addEventListener('input', (e) => {
            filterProducts(e.target.value);
        });
    }
    
    // ✅ FILTRO POR CATEGORÍA EN PRODUCTOS
    const filterCategory = document.getElementById('filterCategory');
    if (filterCategory) {
        filterCategory.addEventListener('change', (e) => {
            filterByCategory(e.target.value);
        });
    }
    
    // 🔍 BÚSQUEDA EN INVENTARIO
    const searchInventory = document.getElementById('searchInventory');
    if (searchInventory) {
        searchInventory.addEventListener('input', (e) => {
            filterInventory(e.target.value);
        });
    }
    
    // ============================================
    // ✅ FILTRO DE VENTAS POR FECHA
    // ============================================
    
    const filterFrom = document.getElementById('filterSalesFrom');
    const filterTo = document.getElementById('filterSalesTo');
    const applyFilterBtn = document.getElementById('applySalesFilter');
    const clearFilterBtn = document.getElementById('clearSalesFilter');
    const filterThisWeekBtn = document.getElementById('filterThisWeek');
    const filterThisMonthBtn = document.getElementById('filterThisMonth');
    
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            const from = filterFrom?.value || '';
            const to = filterTo?.value || '';
            
            if (!from && !to) {
                showNotification('ℹ️ Selecciona al menos una fecha para filtrar', 'info');
                return;
            }
            
            import('./modules/sales.js').then(module => {
                module.filterSalesByDate(from || null, to || null);
            }).catch(error => {
                console.error('Error al filtrar:', error);
                showNotification('❌ Error al aplicar filtro', 'error');
            });
        });
    }
    
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            import('./modules/sales.js').then(module => {
                module.clearSalesFilter();
                showNotification('✅ Filtro limpiado', 'success');
            }).catch(error => {
                console.error('Error al limpiar filtro:', error);
                showNotification('❌ Error al limpiar filtro', 'error');
            });
        });
    }
    
    if (filterThisWeekBtn) {
        filterThisWeekBtn.addEventListener('click', () => {
            import('./modules/sales.js').then(module => {
                module.filterThisWeek();
            }).catch(error => {
                console.error('Error al filtrar por semana:', error);
                showNotification('❌ Error al filtrar por semana', 'error');
            });
        });
    }
    
    if (filterThisMonthBtn) {
        filterThisMonthBtn.addEventListener('click', () => {
            import('./modules/sales.js').then(module => {
                module.filterThisMonth();
            }).catch(error => {
                console.error('Error al filtrar por mes:', error);
                showNotification('❌ Error al filtrar por mes', 'error');
            });
        });
    }
    
    if (filterFrom) {
        filterFrom.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilterBtn?.click();
        });
    }
    
    if (filterTo) {
        filterTo.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilterBtn?.click();
        });
    }
    
    // ============================================
    // MODAL DE HISTORIAL DE INVENTARIO
    // ============================================
    
    // Cerrar con el botón X
    document.querySelector('.close-history')?.addEventListener('click', () => {
        document.getElementById('historyModal').style.display = 'none';
    });
    
    // Cerrar al hacer clic fuera del modal
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('historyModal')) {
            document.getElementById('historyModal').style.display = 'none';
        }
    });
    
    // Cerrar con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('historyModal').style.display = 'none';
        }
    });
    
    // ============================================
    // FIN MODAL DE HISTORIAL
    // ============================================
    
    // Modal de producto
    document.querySelector('.close')?.addEventListener('click', () => {
        document.getElementById('productModal').style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) {
            document.getElementById('productModal').style.display = 'none';
        }
    });
    
    // Modal de inventario
    document.getElementById('inventoryModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('inventoryModal')) {
            closeInventoryModal();
        }
    });
    document.querySelector('.close-inventory')?.addEventListener('click', closeInventoryModal);
    document.getElementById('invCancelBtn')?.addEventListener('click', closeInventoryModal);
    document.getElementById('invConfirmBtn')?.addEventListener('click', confirmInventoryAdjust);
    
    document.getElementById('invAddBtn')?.addEventListener('click', () => {
        const input = document.getElementById('inventoryQuantity');
        input.value = parseInt(input.value) + 1;
        input.dispatchEvent(new Event('input'));
    });
    document.getElementById('invSubtractBtn')?.addEventListener('click', () => {
        const input = document.getElementById('inventoryQuantity');
        const current = parseInt(input.value);
        if (current > 1) {
            input.value = current - 1;
            input.dispatchEvent(new Event('input'));
        }
    });
    document.getElementById('inventoryQuantity')?.addEventListener('input', function() {
        const value = parseInt(this.value);
        if (isNaN(value) || value <= 0) {
            this.value = 1;
        }
    });
    document.getElementById('inventoryQuantity')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            confirmInventoryAdjust();
        }
    });
    
    // Retiro de efectivo
    document.getElementById('withdrawBtn')?.addEventListener('click', openWithdrawModal);
    document.querySelector('.close-withdraw')?.addEventListener('click', () => {
        document.getElementById('withdrawModal').style.display = 'none';
    });
    document.getElementById('cancelWithdrawBtn')?.addEventListener('click', () => {
        document.getElementById('withdrawModal').style.display = 'none';
    });
    document.getElementById('confirmWithdrawBtn')?.addEventListener('click', confirmWithdraw);
    document.getElementById('withdrawAmount')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('confirmWithdrawBtn').click();
        }
    });
    
    // Venta múltiple
    document.getElementById('openMultiSaleBtn')?.addEventListener('click', openMultiSaleModal);
    document.querySelector('.close-multi-sale')?.addEventListener('click', () => {
        document.getElementById('multiSaleModal').style.display = 'none';
    });
    document.getElementById('cancelMultiSaleBtn')?.addEventListener('click', () => {
        document.getElementById('multiSaleModal').style.display = 'none';
    });
    document.getElementById('addItemBtn')?.addEventListener('click', addItemToSale);
    document.getElementById('confirmMultiSaleBtn')?.addEventListener('click', confirmMultiSale);
    document.getElementById('multiSaleQuantity')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('addItemBtn').click();
        }
    });
    
    // Productos - Precio
    document.getElementById('prodPrice')?.addEventListener('blur', function() {
        const value = parseFloat(this.value);
        if (!isNaN(value) && value > 0) {
            this.value = value.toFixed(2);
        }
    });
    
    // ✅ SUBMIT DEL FORMULARIO DE PRODUCTO
    document.getElementById('productForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const id = document.getElementById('productId').value;
            const name = document.getElementById('prodName').value.trim();
            const description = document.getElementById('prodDescription').value.trim();
            const categoria = document.getElementById('prodCategory').value;
            const type = document.getElementById('prodType').value;
            const batchSize = parseInt(document.getElementById('prodBatchSize').value) || null;
            const cost = parseFloat(document.getElementById('prodCost').value);
            const priceInput = document.getElementById('prodPrice');
            
            let price = parseFloat(priceInput?.value);
            
            if (isNaN(price) || price <= 0) {
                showNotification('❌ Ingresa un precio de venta válido (mayor a 0)', 'error');
                priceInput?.focus();
                return;
            }
            
            price = roundToTwo(price);
            const stock = parseInt(document.getElementById('prodStock').value) || 0;
            
            if (!name) {
                showNotification('❌ El nombre del producto es obligatorio', 'error');
                return;
            }
            if (!cost || cost <= 0) {
                showNotification('❌ El costo debe ser mayor a 0', 'error');
                return;
            }
            if (type === 'batch' && (!batchSize || batchSize <= 0)) {
                showNotification('❌ El tamaño del lote debe ser mayor a 0', 'error');
                return;
            }
            
            const product = {
                name,
                description,
                categoria,
                type,
                batchSize: type === 'batch' ? batchSize : null,
                cost: roundToTwo(cost),
                price: price,
                stock: stock
            };
            
            await saveProduct(product, id || null);
            showNotification(id ? '✅ Producto actualizado' : '✅ Producto agregado', 'success');
            document.getElementById('productModal').style.display = 'none';
            
            const categories = await getCategories();
            renderCategories(categories);
            
        } catch (error) {
            console.error('❌ Error:', error);
            showNotification('Error al guardar producto: ' + (error.message || ''), 'error');
        }
    });
    
    // ===== MODAL: CATEGORÍAS =====
    document.querySelector('.close-category')?.addEventListener('click', () => {
        document.getElementById('categoryModal').style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('categoryModal')) {
            document.getElementById('categoryModal').style.display = 'none';
        }
    });
    
    document.getElementById('categoryForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const id = document.getElementById('categoryId').value;
            const name = document.getElementById('categoryName').value.trim();
            const icon = document.getElementById('categoryIcon').value.trim() || '📦';
            const color = document.getElementById('categoryColor').value || '#a0aec0';
            
            if (!name) {
                showNotification('❌ El nombre es obligatorio', 'error');
                return;
            }
            
            await saveCategory({ name, icon, color }, id || null);
            showNotification(id ? '✅ Categoría actualizada' : '✅ Categoría agregada', 'success');
            document.getElementById('categoryModal').style.display = 'none';
            await updateCategories();
            
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar categoría', 'error');
        }
    });
    
    // Sincronizar color con input text
    document.getElementById('categoryColor')?.addEventListener('input', function() {
        document.getElementById('categoryColorText').value = this.value;
    });
    
    document.getElementById('categoryColorText')?.addEventListener('input', function() {
        document.getElementById('categoryColor').value = this.value;
    });
    
    // Tipo de producto
    document.getElementById('prodType')?.addEventListener('change', function() {
        const isBatch = this.value === 'batch';
        document.querySelector('.batch-fields').style.display = isBatch ? 'block' : 'none';
        if (!isBatch) document.getElementById('prodBatchSize').value = '';
        updateSalePrice();
    });
    
    document.getElementById('prodCost')?.addEventListener('input', updateSalePrice);
    document.getElementById('prodBatchSize')?.addEventListener('input', updateSalePrice);
});

// ============================================
// FUNCIONES DE DIAGNÓSTICO (para consola)
// ============================================

window.diagnosticarVentas = async () => {
    try {
        console.log('🔍 DIAGNÓSTICO DE VENTAS');
        console.log('========================');
        
        // 1. Verificar allSalesData
        console.log('📊 allSalesData en módulo:', window.allSalesData || 'No definido');
        
        // 2. Importar firebase-config
        const firebase = await import('./firebase-config.js');
        console.log('✅ firebase-config cargado');
        
        // 3. Obtener ventas directamente
        const sales = await firebase.getSales();
        console.log('📊 Ventas en Firebase:', sales.length);
        
        if (sales.length > 0) {
            console.log('📋 Primera venta:');
            console.log(sales[0]);
            console.log('📅 Campos de fecha:');
            console.log('  createdAt:', sales[0].createdAt);
            console.log('  saleDate:', sales[0].saleDate);
            
            // Mostrar todas las ventas con fechas
            console.log('📋 Resumen de ventas:');
            sales.forEach((s, i) => {
                let fecha = 'Sin fecha';
                if (s.createdAt) {
                    if (typeof s.createdAt === 'object' && s.createdAt !== null && typeof s.createdAt.toDate === 'function') {
                        fecha = s.createdAt.toDate().toLocaleDateString('es-MX');
                    } else if (s.createdAt.seconds) {
                        fecha = new Date(s.createdAt.seconds * 1000).toLocaleDateString('es-MX');
                    } else if (typeof s.createdAt === 'string') {
                        fecha = new Date(s.createdAt).toLocaleDateString('es-MX');
                    }
                } else if (s.saleDate) {
                    if (typeof s.saleDate === 'string') {
                        fecha = new Date(s.saleDate).toLocaleDateString('es-MX');
                    }
                }
                console.log(`  ${i+1}. ${s.productName || 'Producto'} - ${fecha} - $${s.total || s.totalPrice || 0}`);
            });
        } else {
            console.warn('⚠️ No hay ventas en Firebase');
            console.log('💡 Registra una venta de prueba y vuelve a intentar');
        }
        
        return sales;
        
    } catch (error) {
        console.error('❌ Error en diagnóstico:', error);
        console.error('Detalles:', error.message);
    }
};

window.recargarVentas = async () => {
    try {
        console.log('🔄 Recargando ventas...');
        const { loadSales } = await import('./modules/sales.js');
        await loadSales();
        console.log('✅ Ventas recargadas');
        console.log('📊 allSalesData:', window.allSalesData);
    } catch (error) {
        console.error('❌ Error al recargar:', error);
    }
};

window.verTodasLasVentas = () => {
    console.log('📊 Ventas en el sistema:');
    console.log('allSalesData:', window.allSalesData);
    if (window.allSalesData && window.allSalesData.length > 0) {
        console.table(window.allSalesData.map(s => ({
            ID: s.id?.slice(0, 8) || 'N/A',
            Producto: s.productName || 'Múltiple',
            Cantidad: s.quantity || s.items?.length || 0,
            Total: s.total || s.totalPrice || 0,
            Fecha: s.createdAt?.toDate?.()?.toLocaleDateString?.('es-MX') || 
                   s.saleDate || 
                   'Sin fecha'
        })));
    } else {
        console.warn('⚠️ No hay ventas cargadas');
    }
};

console.log('✅ Diagnóstico disponible:');
console.log('  - window.diagnosticarVentas()  → Ver ventas en Firebase');
console.log('  - window.recargarVentas()      → Recargar ventas en la interfaz');
console.log('  - window.verTodasLasVentas()   → Ver ventas en formato tabla');
console.log('  - window.viewInventoryHistory(id) → Ver historial de inventario');
console.log('  - window.closeHistoryModal()   → Cerrar modal de historial');