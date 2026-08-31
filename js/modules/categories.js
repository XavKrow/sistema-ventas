// js/modules/categories.js
// ============================================
// GESTIÓN DE CATEGORÍAS
// ============================================

import { getCategories, saveCategory, deleteCategory, listenCategories } from '../firebase-config.js';
import { showNotification } from './utils.js';

// ============================================
// VARIABLES
// ============================================

let allCategories = [];

// ============================================
// RENDERIZAR CATEGORÍAS
// ============================================

export const renderCategories = (categories) => {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    allCategories = categories || [];
    
    if (!allCategories || allCategories.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p><i class="fas fa-folder-open"></i> No hay categorías registradas</p>
                <button onclick="window.openAddCategory()" class="btn btn-primary">
                    <i class="fas fa-plus"></i> Agregar Categoría
                </button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-smile"></i> Icono</th>
                        <th><i class="fas fa-tag"></i> Nombre</th>
                        <th><i class="fas fa-palette"></i> Color</th>
                        <th><i class="fas fa-box"></i> Productos</th>
                        <th><i class="fas fa-cogs"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    allCategories.forEach(category => {
        // Contar productos con esta categoría
        const productCount = window.allProducts?.filter(p => p.categoria === category.name).length || 0;
        
        html += `
            <tr>
                <td style="font-size: 24px; text-align: center;">${category.icon || '📦'}</td>
                <td><strong>${category.name}</strong></td>
                <td>
                    <span style="display: inline-block; width: 20px; height: 20px; border-radius: 4px; background: ${category.color || '#a0aec0'}; vertical-align: middle;"></span>
                    <span style="font-size: 12px; color: var(--text-muted); margin-left: 5px;">${category.color || '#a0aec0'}</span>
                </td>
                <td><span class="badge badge-info">${productCount}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="window.editCategory('${category.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.deleteCategoryHandler('${category.id}')">
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
// RENDERIZAR CATEGORÍAS EN SELECTS
// ============================================

export const renderCategoryOptions = (categories) => {
    // Actualizar select en modal de producto
    const prodSelect = document.getElementById('prodCategory');
    if (prodSelect) {
        const currentValue = prodSelect.value;
        prodSelect.innerHTML = '<option value=""><i class="fas fa-times"></i> Sin categoría</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.icon || '📦'} ${cat.name}`;
            prodSelect.appendChild(option);
        });
        if (currentValue) prodSelect.value = currentValue;
    }
    
    // Actualizar filtro en productos
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value=""><i class="fas fa-folder"></i> Todas las categorías</option>';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.name;
            option.textContent = `${cat.icon || '📦'} ${cat.name}`;
            filterSelect.appendChild(option);
        });
        if (currentValue) filterSelect.value = currentValue;
    }
};

// ============================================
// ACCIONES DE CATEGORÍAS
// ============================================

export const openAddCategory = () => {
    // ✅ CORRECCIÓN: Cambiar textContent por innerHTML
    document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-plus"></i> Agregar Categoría';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categoryIcon').value = '📦';
    document.getElementById('categoryColor').value = '#667eea';
    document.getElementById('categoryColorText').value = '#667eea';
    document.getElementById('categoryModal').style.display = 'flex';
    document.getElementById('categoryName').focus();
};

export const editCategory = async (id) => {
    try {
        const categories = await getCategories();
        const category = categories.find(c => c.id === id);
        
        if (!category) {
            showNotification('❌ Categoría no encontrada', 'error');
            return;
        }
        
        // ✅ CORRECCIÓN: Cambiar textContent por innerHTML
        document.getElementById('categoryModalTitle').innerHTML = '<i class="fas fa-edit"></i> Editar Categoría';
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryName').value = category.name;
        document.getElementById('categoryIcon').value = category.icon || '📦';
        document.getElementById('categoryColor').value = category.color || '#667eea';
        document.getElementById('categoryColorText').value = category.color || '#667eea';
        document.getElementById('categoryModal').style.display = 'flex';
        document.getElementById('categoryName').focus();
    } catch (error) {
        showNotification('❌ Error al cargar categoría', 'error');
    }
};

export const deleteCategoryHandler = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?\nLos productos con esta categoría quedarán sin categoría.')) return;
    
    try {
        await deleteCategory(id);
        showNotification('✅ Categoría eliminada correctamente', 'success');
    } catch (error) {
        showNotification('❌ Error al eliminar categoría', 'error');
    }
};

// ============================================
// ACTUALIZAR CATEGORÍAS
// ============================================

export const updateCategories = async () => {
    try {
        const categories = await getCategories();
        renderCategories(categories);
        renderCategoryOptions(categories);
        return categories;
    } catch (error) {
        console.error('Error al actualizar categorías:', error);
    }
};