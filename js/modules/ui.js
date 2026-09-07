// ============================================
// UI - TABS Y NAVEGACIÓN
// ============================================

// ============================================
// VARIABLES
// ============================================

const STORAGE_KEY = 'activeTab';

// ============================================
// CONFIGURAR TABS
// ============================================

export const setupTabs = () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
        products: document.getElementById('products'),
        inventory: document.getElementById('inventory'),
        sales: document.getElementById('sales'),
        finances: document.getElementById('finances'),
        stats: document.getElementById('stats'),
        categories: document.getElementById('categories')
    };
    
    // ✅ Obtener la pestaña guardada o usar 'products' por defecto
    const savedTab = localStorage.getItem(STORAGE_KEY) || 'products';
    
    // ✅ Activar la pestaña guardada
    activateTab(savedTab, tabs, panels);
    
    // Event listeners para cada tab
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName) {
                activateTab(tabName, tabs, panels);
                // ✅ Guardar la pestaña activa en localStorage
                localStorage.setItem(STORAGE_KEY, tabName);
            }
        });
    });
};

// ============================================
// ACTIVAR PESTAÑA
// ============================================

const activateTab = (tabName, tabs, panels) => {
    // Desactivar todas las pestañas y paneles
    tabs.forEach(t => t.classList.remove('active'));
    Object.values(panels).forEach(p => {
        if (p) p.classList.remove('active');
    });
    
    // Activar la pestaña seleccionada
    const activeTab = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Activar el panel correspondiente
    if (panels[tabName]) {
        panels[tabName].classList.add('active');
    }
};

// ============================================
// CAMBIAR A UNA PESTAÑA ESPECÍFICA (EXPORTAR)
// ============================================

export const switchTab = (tabName) => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = {
        products: document.getElementById('products'),
        inventory: document.getElementById('inventory'),
        sales: document.getElementById('sales'),
        finances: document.getElementById('finances'),
        stats: document.getElementById('stats'),
        categories: document.getElementById('categories')
    };
    
    if (panels[tabName]) {
        activateTab(tabName, tabs, panels);
        localStorage.setItem(STORAGE_KEY, tabName);
    }
};

// ============================================
// OBTENER PESTAÑA ACTIVA (EXPORTAR)
// ============================================

export const getActiveTab = () => {
    return localStorage.getItem(STORAGE_KEY) || 'products';
};