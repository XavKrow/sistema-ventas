// js/modules/stats.js
// ============================================
// ESTADÍSTICAS Y GRÁFICAS
// ============================================

import { getSales, getProducts } from '../firebase-config.js';
import { formatCurrency } from './utils.js';

// ============================================
// VARIABLES
// ============================================

let salesChart = null;
let categoryChart = null;
let incomeExpenseChart = null;
let topProductsChart = null;

// ============================================
// ACTUALIZAR ESTADÍSTICAS
// ============================================

export const updateStats = async () => {
    try {
        console.log('📊 Actualizando estadísticas...');
        const sales = await getSales();
        const products = await getProducts();
        
        // Calcular totales
        const totalSales = sales.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
        const totalProducts = products.length;
        const lowStock = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;
        const outOfStock = products.filter(p => (p.stock || 0) === 0).length;
        
        // Actualizar tarjetas
        const elTotalSales = document.getElementById('statsTotalSales');
        const elTotalProducts = document.getElementById('statsTotalProducts');
        const elLowStock = document.getElementById('statsLowStock');
        const elOutOfStock = document.getElementById('statsOutOfStock');
        
        if (elTotalSales) elTotalSales.textContent = formatCurrency(totalSales);
        if (elTotalProducts) elTotalProducts.textContent = totalProducts;
        if (elLowStock) elLowStock.textContent = lowStock;
        if (elOutOfStock) elOutOfStock.textContent = outOfStock;
        
        // ✅ Actualizar gráficas
        await updateSalesChart(sales);
        await updateCategoryChart(products);
        await updateIncomeExpenseChart(sales);
        await updateTopProductsChart(sales);
        
        console.log('✅ Estadísticas actualizadas');
        
    } catch (error) {
        console.error('Error al actualizar estadísticas:', error);
    }
};

// ============================================
// FUNCIÓN AUXILIAR: Mostrar estado vacío
// ============================================

const showEmptyChart = (canvasId, icon, title, subtitle, extraText = '') => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    
    // Destruir gráficas existentes
    if (canvasId === 'salesChart' && salesChart) { salesChart.destroy(); salesChart = null; }
    if (canvasId === 'categoryChart' && categoryChart) { categoryChart.destroy(); categoryChart = null; }
    if (canvasId === 'incomeExpenseChart' && incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
    if (canvasId === 'topProductsChart' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }
    
    parent.innerHTML = `
        <div class="chart-empty">
            <div class="icon">${icon}</div>
            <div class="title">${title}</div>
            <div class="subtitle">${subtitle}</div>
            ${extraText ? `<div style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">${extraText}</div>` : ''}
        </div>
    `;
};

// ============================================
// GRÁFICA: VENTAS POR DÍA
// ============================================

const updateSalesChart = async (sales) => {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('salesChart', '📊', 'No hay ventas registradas', 'Registra tu primera venta para ver estadísticas');
        return;
    }
    
    if (sales.length < 2) {
        const total = sales.reduce((sum, s) => sum + (s.total || s.totalPrice || 0), 0);
        showEmptyChart('salesChart', '📈', 'Se necesitan más ventas', 'Registra al menos 2 ventas para ver tendencias', `Total: ${formatCurrency(total)}`);
        return;
    }
    
    // Agrupar ventas por día
    const salesByDay = {};
    sales.forEach(sale => {
        const date = new Date(sale.saleDate || sale.createdAt?.toDate?.() || sale.createdAt);
        if (!isNaN(date)) {
            const day = date.toLocaleDateString('es-MX');
            salesByDay[day] = (salesByDay[day] || 0) + (sale.total || sale.totalPrice || 0);
        }
    });
    
    const sortedDays = Object.keys(salesByDay).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDays.length > 0 ? sortedDays : ['Sin datos'];
    const data = sortedDays.length > 0 ? sortedDays.map(day => salesByDay[day]) : [0];
    
    if (salesChart) salesChart.destroy();
    
    try {
        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas por Día',
                    data: data,
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                            callback: value => '$' + value.toFixed(0)
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de ventas:', error);
    }
};

// ============================================
// GRÁFICA: PRODUCTOS POR CATEGORÍA
// ============================================

const updateCategoryChart = async (products) => {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    if (!products || products.length === 0) {
        showEmptyChart('categoryChart', '📦', 'No hay productos registrados', 'Agrega productos para ver la distribución por categoría');
        return;
    }
    
    // Agrupar por categoría
    const categories = {};
    const colors = {
        'Pieza': 'rgba(72, 187, 120, 0.6)',
        'Lote': 'rgba(102, 126, 234, 0.6)',
        'Sin categoría': 'rgba(237, 137, 54, 0.6)'
    };
    
    products.forEach(product => {
        const category = product.categoria || (product.type === 'batch' ? 'Lote' : 'Pieza');
        categories[category] = (categories[category] || 0) + 1;
    });
    
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    const backgroundColors = labels.map(label => colors[label] || 'rgba(102, 126, 234, 0.6)');
    
    if (labels.length === 1 && labels[0] === 'Sin categoría') {
        showEmptyChart('categoryChart', '🏷️', 'Los productos no tienen categoría', 'Asigna categorías a tus productos para ver estadísticas', `Total: ${products.length} productos`);
        return;
    }
    
    if (categoryChart) categoryChart.destroy();
    
    try {
        categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-card'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary'),
                            padding: 15
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de categorías:', error);
    }
};

// ============================================
// GRÁFICA: INGRESOS VS RETIROS
// ============================================

const updateIncomeExpenseChart = async (sales) => {
    const ctx = document.getElementById('incomeExpenseChart');
    if (!ctx) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('incomeExpenseChart', '📊', 'No hay datos de ingresos', 'Registra ventas para ver la comparación de ingresos vs gastos');
        return;
    }
    
    try {
        const { getCashWithdrawals } = await import('./finances.js');
        const withdrawals = await getCashWithdrawals() || [];
        
        // Agrupar por mes
        const months = {};
        const now = new Date();
        const last6Months = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now);
            date.setMonth(date.getMonth() - i);
            const key = date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
            last6Months.push(key);
            months[key] = { income: 0, expense: 0 };
        }
        
        // Procesar ventas (ingresos)
        sales.forEach(sale => {
            const date = new Date(sale.saleDate || sale.createdAt?.toDate?.() || sale.createdAt);
            if (!isNaN(date)) {
                const key = date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                if (months[key]) {
                    months[key].income += (sale.total || sale.totalPrice || 0);
                }
            }
        });
        
        // Procesar retiros (gastos)
        withdrawals.forEach(withdrawal => {
            const date = new Date(withdrawal.createdAt?.toDate?.() || withdrawal.date || withdrawal.createdAt);
            if (!isNaN(date)) {
                const key = date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                if (months[key]) {
                    months[key].expense += Number(withdrawal.amount) || 0;
                }
            }
        });
        
        const labels = last6Months;
        const incomeData = labels.map(label => months[label]?.income || 0);
        const expenseData = labels.map(label => months[label]?.expense || 0);
        
        const hasIncome = incomeData.some(v => v > 0);
        const hasExpense = expenseData.some(v => v > 0);
        
        if (!hasIncome && !hasExpense) {
            showEmptyChart('incomeExpenseChart', '💰', 'No hay suficientes datos', 'Registra ventas y retiros para ver la comparación');
            return;
        }
        
        if (incomeExpenseChart) incomeExpenseChart.destroy();
        
        incomeExpenseChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '💰 Ingresos',
                        data: incomeData,
                        borderColor: '#48bb78',
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4
                    },
                    {
                        label: '💸 Gastos',
                        data: expenseData,
                        borderColor: '#f56565',
                        backgroundColor: 'rgba(245, 101, 101, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted'),
                            callback: value => '$' + value.toFixed(0)
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de ingresos/gastos:', error);
        showEmptyChart('incomeExpenseChart', '❌', 'Error al cargar datos', 'Reintenta actualizando la página');
    }
};

// ============================================
// GRÁFICA: TOP 5 PRODUCTOS MÁS VENDIDOS
// ============================================

const updateTopProductsChart = async (sales) => {
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('topProductsChart', '🏆', 'No hay ventas registradas', 'Registra ventas para ver los productos más vendidos');
        return;
    }
    
    // Contar productos vendidos
    const productCount = {};
    
    sales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            // Venta múltiple
            sale.items.forEach(item => {
                const name = item.productName || 'Producto desconocido';
                productCount[name] = (productCount[name] || 0) + item.quantity;
            });
        } else if (sale.productName) {
            // Venta simple
            const name = sale.productName;
            productCount[name] = (productCount[name] || 0) + (sale.quantity || 1);
        }
    });
    
    // Ordenar y tomar top 5
    const sorted = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(72, 187, 120, 0.8)',
        'rgba(237, 137, 54, 0.8)',
        'rgba(245, 101, 101, 0.8)',
        'rgba(159, 122, 234, 0.8)'
    ];
    
    if (topProductsChart) {
        topProductsChart.destroy();
    }
    
    // Verificar si hay datos
    if (sorted.length === 0) {
        showEmptyChart('topProductsChart', '🏆', 'No hay productos vendidos', 'Registra ventas para ver los productos más vendidos');
        return;
    }
    
    try {
        topProductsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Unidades Vendidas',
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderColor: colors.slice(0, data.length).map(c => c.replace('0.8', '1')),
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.parsed.x + ' unidades vendidas';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        }
                    },
                    x: {
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted')
                        },
                        grid: {
                            color: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
                        },
                        title: {
                            display: true,
                            text: 'Unidades Vendidas',
                            color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted')
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de top productos:', error);
    }
};