// ============================================
// CONFIGURACIÓN DE INTERFAZ
// ============================================

import { getProducts, getSales } from '../firebase-config.js';
import { renderProducts } from './products.js';
import { renderInventory } from './inventory.js';
import { renderSales, updateSalesSummary } from './sales.js';

export const setupTabs = () => {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'products') getProducts().then(renderProducts);
            else if (tabId === 'inventory') getProducts().then(renderInventory);
            else if (tabId === 'sales') {
                getSales().then(sales => {
                    renderSales(sales);
                    updateSalesSummary(sales);
                });
            }
        });
    });
};