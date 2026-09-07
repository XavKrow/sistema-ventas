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
// FUNCIÓN AUXILIAR: Obtener colores del tema
// ============================================

const getThemeColors = () => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    return {
        textSecondary: styles.getPropertyValue('--text-secondary') || '#4a5568',
        textMuted: styles.getPropertyValue('--text-muted') || '#a0aec0',
        borderColor: styles.getPropertyValue('--border-color') || '#e2e8f0',
        bgCard: styles.getPropertyValue('--bg-card') || '#ffffff',
        primary: 'rgba(102, 126, 234, 0.6)',
        primaryBorder: 'rgba(102, 126, 234, 1)',
        success: 'rgba(72, 187, 120, 0.6)',
        successBorder: '#48bb78',
        danger: 'rgba(245, 101, 101, 0.6)',
        dangerBorder: '#f56565',
        warning: 'rgba(237, 137, 54, 0.6)',
        warningBorder: '#ed8936'
    };
};

// ============================================
// FUNCIÓN AUXILIAR: Reiniciar canvas
// ============================================

const resetCanvas = (canvasId) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    // Destruir gráfica asociada
    if (canvasId === 'salesChart' && salesChart) {
        try { salesChart.destroy(); } catch (e) {}
        salesChart = null;
    }
    if (canvasId === 'categoryChart' && categoryChart) {
        try { categoryChart.destroy(); } catch (e) {}
        categoryChart = null;
    }
    if (canvasId === 'incomeExpenseChart' && incomeExpenseChart) {
        try { incomeExpenseChart.destroy(); } catch (e) {}
        incomeExpenseChart = null;
    }
    if (canvasId === 'topProductsChart' && topProductsChart) {
        try { topProductsChart.destroy(); } catch (e) {}
        topProductsChart = null;
    }
    
    // Clonar y reemplazar el canvas para limpiarlo completamente
    const parent = canvas.parentElement;
    const newCanvas = canvas.cloneNode();
    newCanvas.id = canvas.id;
    parent.replaceChild(newCanvas, canvas);
    
    return document.getElementById(canvasId);
};

// ============================================
// FUNCIÓN AUXILIAR: Mostrar estado vacío
// ============================================

const showEmptyChart = (canvasId, icon, title, subtitle, extraText = '') => {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const parent = canvas.parentElement;
    
    // Destruir gráficas existentes de forma segura
    try {
        if (canvasId === 'salesChart' && salesChart) { salesChart.destroy(); salesChart = null; }
        if (canvasId === 'categoryChart' && categoryChart) { categoryChart.destroy(); categoryChart = null; }
        if (canvasId === 'incomeExpenseChart' && incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
        if (canvasId === 'topProductsChart' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }
    } catch (e) {
        // Ignorar errores al destruir
    }
    
    parent.innerHTML = `
        <div class="chart-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; height: 100%; min-height: 200px;">
            <div style="font-size: 48px; color: var(--text-muted);">${icon}</div>
            <div style="font-size: 16px; font-weight: 600; margin-top: 10px; color: var(--text-secondary);">${title}</div>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 5px; text-align: center;">${subtitle}</div>
            ${extraText ? `<div style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">${extraText}</div>` : ''}
        </div>
    `;
};

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
// GRÁFICA: VENTAS POR DÍA
// ============================================

const updateSalesChart = async (sales) => {
    const canvas = resetCanvas('salesChart');
    if (!canvas) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('salesChart', '<i class="fas fa-chart-bar" style="color: #a0aec0;"></i>', 'No hay ventas registradas', 'Registra tu primera venta para ver estadísticas');
        return;
    }
    
    // ✅ Verificar si hay ventas con fechas válidas
    const validSales = sales.filter(s => s.saleDate || s.createdAt);
    if (validSales.length === 0) {
        showEmptyChart('salesChart', '<i class="fas fa-clock" style="color: #ed8936;"></i>', 'Ventas sin fecha', 'Las ventas no tienen fecha asignada');
        return;
    }
    
    // Agrupar ventas por día
    const salesByDay = {};
    validSales.forEach(sale => {
        let date = null;
        if (sale.saleDate) {
            date = new Date(sale.saleDate);
        } else if (sale.createdAt) {
            if (typeof sale.createdAt === 'object' && sale.createdAt !== null && typeof sale.createdAt.toDate === 'function') {
                date = sale.createdAt.toDate();
            } else if (typeof sale.createdAt === 'string') {
                date = new Date(sale.createdAt);
            } else if (sale.createdAt.seconds) {
                date = new Date(sale.createdAt.seconds * 1000);
            }
        }
        
        if (date && !isNaN(date)) {
            const day = date.toLocaleDateString('es-MX');
            salesByDay[day] = (salesByDay[day] || 0) + (sale.total || sale.totalPrice || 0);
        }
    });
    
    const sortedDays = Object.keys(salesByDay).sort((a, b) => new Date(a) - new Date(b));
    const labels = sortedDays.length > 0 ? sortedDays : ['Sin datos'];
    const data = sortedDays.length > 0 ? sortedDays.map(day => salesByDay[day]) : [0];
    
    const colors = getThemeColors();
    
    try {
        salesChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas por Día',
                    data: data,
                    backgroundColor: colors.primary,
                    borderColor: colors.primaryBorder,
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
                            color: colors.textSecondary
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: colors.textMuted,
                            callback: value => '$' + value.toFixed(0)
                        },
                        grid: {
                            color: colors.borderColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textMuted,
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: colors.borderColor
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de ventas:', error);
        showEmptyChart('salesChart', '<i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>', 'Error al crear gráfica', 'Reintenta actualizando la página');
    }
};

// ============================================
// GRÁFICA: PRODUCTOS POR CATEGORÍA
// ============================================

const updateCategoryChart = async (products) => {
    const canvas = resetCanvas('categoryChart');
    if (!canvas) return;
    
    if (!products || products.length === 0) {
        showEmptyChart('categoryChart', '<i class="fas fa-box" style="color: #a0aec0;"></i>', 'No hay productos registrados', 'Agrega productos para ver la distribución por categoría');
        return;
    }
    
    // Agrupar por categoría
    const categories = {};
    const colorsMap = {
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
    const backgroundColors = labels.map(label => colorsMap[label] || 'rgba(102, 126, 234, 0.6)');
    
    if (labels.length === 1 && labels[0] === 'Sin categoría') {
        showEmptyChart('categoryChart', '<i class="fas fa-tags" style="color: #ed8936;"></i>', 'Los productos no tienen categoría', 'Asigna categorías a tus productos para ver estadísticas', `Total: ${products.length} productos`);
        return;
    }
    
    const colors = getThemeColors();
    
    try {
        categoryChart = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: colors.bgCard,
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
                            color: colors.textSecondary,
                            padding: 15
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de categorías:', error);
        showEmptyChart('categoryChart', '<i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>', 'Error al crear gráfica', 'Reintenta actualizando la página');
    }
};

// ============================================
// GRÁFICA: INGRESOS VS RETIROS (CORREGIDA)
// ============================================

const updateIncomeExpenseChart = async (sales) => {
    const canvas = resetCanvas('incomeExpenseChart');
    if (!canvas) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('incomeExpenseChart', '<i class="fas fa-chart-area" style="color: #a0aec0;"></i>', 'No hay datos de ingresos', 'Registra ventas para ver la comparación de ingresos vs gastos');
        return;
    }
    
    try {
        // ✅ Importar dinámicamente
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
            let date = null;
            if (sale.saleDate) {
                date = new Date(sale.saleDate);
            } else if (sale.createdAt) {
                if (typeof sale.createdAt === 'object' && sale.createdAt !== null && typeof sale.createdAt.toDate === 'function') {
                    date = sale.createdAt.toDate();
                } else if (typeof sale.createdAt === 'string') {
                    date = new Date(sale.createdAt);
                } else if (sale.createdAt.seconds) {
                    date = new Date(sale.createdAt.seconds * 1000);
                }
            }
            if (date && !isNaN(date)) {
                const key = date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                if (months[key]) {
                    months[key].income += (sale.total || sale.totalPrice || 0);
                }
            }
        });
        
        // Procesar retiros (gastos)
        withdrawals.forEach(withdrawal => {
            let date = null;
            if (withdrawal.createdAt) {
                if (typeof withdrawal.createdAt === 'object' && withdrawal.createdAt !== null && typeof withdrawal.createdAt.toDate === 'function') {
                    date = withdrawal.createdAt.toDate();
                } else if (typeof withdrawal.createdAt === 'string') {
                    date = new Date(withdrawal.createdAt);
                } else if (withdrawal.createdAt.seconds) {
                    date = new Date(withdrawal.createdAt.seconds * 1000);
                }
            } else if (withdrawal.date) {
                if (typeof withdrawal.date === 'string') {
                    date = new Date(withdrawal.date);
                } else if (typeof withdrawal.date === 'object' && withdrawal.date !== null && typeof withdrawal.date.toDate === 'function') {
                    date = withdrawal.date.toDate();
                }
            }
            if (date && !isNaN(date)) {
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
            showEmptyChart('incomeExpenseChart', '<i class="fas fa-coins" style="color: #a0aec0;"></i>', 'No hay suficientes datos', 'Registra ventas y retiros para ver la comparación');
            return;
        }
        
        const colors = getThemeColors();
        
        incomeExpenseChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '💰 Ingresos',
                        data: incomeData,
                        borderColor: colors.successBorder,
                        backgroundColor: 'rgba(72, 187, 120, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4
                    },
                    {
                        label: '💸 Gastos',
                        data: expenseData,
                        borderColor: colors.dangerBorder,
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
                            color: colors.textSecondary
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            color: colors.textMuted,
                            callback: value => '$' + value.toFixed(0)
                        },
                        grid: {
                            color: colors.borderColor
                        }
                    },
                    x: {
                        ticks: {
                            color: colors.textMuted
                        },
                        grid: {
                            color: colors.borderColor
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de ingresos/gastos:', error);
        showEmptyChart('incomeExpenseChart', '<i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>', 'Error al cargar datos', 'Reintenta actualizando la página');
    }
};

// ============================================
// GRÁFICA: TOP 5 PRODUCTOS MÁS VENDIDOS
// ============================================

const updateTopProductsChart = async (sales) => {
    const canvas = resetCanvas('topProductsChart');
    if (!canvas) return;
    
    if (!sales || sales.length === 0) {
        showEmptyChart('topProductsChart', '<i class="fas fa-trophy" style="color: #a0aec0;"></i>', 'No hay ventas registradas', 'Registra ventas para ver los productos más vendidos');
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
    
    if (sorted.length === 0) {
        showEmptyChart('topProductsChart', '<i class="fas fa-box-open" style="color: #a0aec0;"></i>', 'No hay productos vendidos', 'Registra ventas para ver los productos más vendidos');
        return;
    }
    
    const labels = sorted.map(item => item[0]);
    const data = sorted.map(item => item[1]);
    const colors = [
        'rgba(102, 126, 234, 0.8)',
        'rgba(72, 187, 120, 0.8)',
        'rgba(237, 137, 54, 0.8)',
        'rgba(245, 101, 101, 0.8)',
        'rgba(159, 122, 234, 0.8)'
    ];
    
    const themeColors = getThemeColors();
    
    try {
        topProductsChart = new Chart(canvas, {
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
                            color: themeColors.textSecondary
                        },
                        grid: {
                            color: themeColors.borderColor
                        }
                    },
                    x: {
                        ticks: {
                            color: themeColors.textMuted
                        },
                        grid: {
                            color: themeColors.borderColor
                        },
                        title: {
                            display: true,
                            text: 'Unidades Vendidas',
                            color: themeColors.textMuted
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error al crear gráfica de top productos:', error);
        showEmptyChart('topProductsChart', '<i class="fas fa-exclamation-triangle" style="color: #f56565;"></i>', 'Error al crear gráfica', 'Reintenta actualizando la página');
    }
};