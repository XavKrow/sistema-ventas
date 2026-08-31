// ============================================
// CONFIGURACIÓN DE INTERFAZ
// ============================================

import { getProducts, getSales } from '../firebase-config.js';
import { renderProducts } from './products.js';
import { renderInventory } from './inventory.js';
import { renderSales, updateSalesSummary } from './sales.js';
import { showNotification } from './utils.js';

export const setupTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase active de todos los tabs
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            // Activar tab seleccionado
            this.classList.add('active');
            const tabId = this.dataset.tab;
            const tabPanel = document.getElementById(tabId);
            
            if (tabPanel) {
                tabPanel.classList.add('active');
            }
            
            // Cargar datos según el tab seleccionado
            if (tabId === 'products') {
                getProducts().then(renderProducts).catch(error => {
                    console.error('Error al cargar productos:', error);
                    showNotification('❌ Error al cargar productos', 'error');
                });
            } else if (tabId === 'inventory') {
                getProducts().then(renderInventory).catch(error => {
                    console.error('Error al cargar inventario:', error);
                    showNotification('❌ Error al cargar inventario', 'error');
                });
            } else if (tabId === 'sales') {
                getSales().then(sales => {
                    renderSales(sales);
                    updateSalesSummary(sales);
                }).catch(error => {
                    console.error('Error al cargar ventas:', error);
                    showNotification('❌ Error al cargar ventas', 'error');
                });
            } else if (tabId === 'finances') {
                // El tab de finanzas se actualiza automáticamente
                // desde updateFinancialPanel en finances.js
            } else if (tabId === 'stats') {
                // El tab de estadísticas se actualiza automáticamente
                // desde updateStats en stats.js
            } else if (tabId === 'categories') {
                // El tab de categorías se actualiza automáticamente
                // desde updateCategories en categories.js
            }
        });
    });
    
    // ✅ Cargar datos del tab activo al iniciar
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) {
        const tabId = activeTab.dataset.tab;
        if (tabId === 'products') {
            getProducts().then(renderProducts);
        } else if (tabId === 'inventory') {
            getProducts().then(renderInventory);
        } else if (tabId === 'sales') {
            getSales().then(sales => {
                renderSales(sales);
                updateSalesSummary(sales);
            });
        }
    }
};