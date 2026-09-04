// ============================================
// MÓDULO DE EXPORTACIÓN (PDF y CSV)
// ============================================

import { 
    getProducts, 
    getSales, 
    getCashWithdrawals 
} from '../firebase-config.js';

import { 
    formatCurrency, 
    formatDate, 
    showNotification, 
    getPriceAsNumber, 
    getCostPerPiece 
} from './utils.js';

// ============================================
// 1. EXPORTAR A PDF (IMPRESIÓN)
// ============================================

export const printToPDF = (elementId, title, options = {}) => {
    const content = document.getElementById(elementId);
    if (!content) {
        showNotification('❌ No hay datos para imprimir', 'error');
        return;
    }

    // Verificar si hay datos
    const hasData = content.querySelector('table tbody tr') !== null;
    if (!hasData) {
        showNotification('❌ No hay datos para exportar', 'error');
        return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');

    if (!printWindow) {
        showNotification('❌ Permite las ventanas emergentes para imprimir', 'error');
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title} - Sistema de Ventas</title>
            <meta charset="UTF-8">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
            <style>
                /* Reset */
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                body {
                    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
                    padding: 30px;
                    color: #1a202c;
                    background: #ffffff;
                }
                
                .header {
                    text-align: center;
                    border-bottom: 3px solid #667eea;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                
                .header h1 {
                    font-size: 24px;
                    color: #2d3748;
                    margin-bottom: 5px;
                }
                
                .header h1 i {
                    color: #667eea;
                }
                
                .header .subtitle {
                    color: #718096;
                    font-size: 14px;
                }
                
                .header .info-row {
                    display: flex;
                    justify-content: center;
                    gap: 30px;
                    margin-top: 8px;
                    font-size: 13px;
                    color: #4a5568;
                    flex-wrap: wrap;
                }
                
                .header .info-row span {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .table-container {
                    margin: 15px 0;
                    overflow-x: auto;
                }
                
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                }
                
                table thead {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: #ffffff;
                }
                
                table th {
                    padding: 10px 12px;
                    text-align: left;
                    font-weight: 600;
                    border: 1px solid #5a67d8;
                }
                
                table td {
                    padding: 8px 12px;
                    border: 1px solid #e2e8f0;
                    vertical-align: middle;
                }
                
                table tbody tr:nth-child(even) {
                    background: #f7fafc;
                }
                
                .text-success { color: #48bb78; }
                .text-danger { color: #f56565; }
                .text-warning { color: #ed8936; }
                .text-primary { color: #667eea; }
                
                .badge {
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                }
                
                .badge-success { background: #48bb78; color: #fff; }
                .badge-danger { background: #f56565; color: #fff; }
                .badge-warning { background: #ed8936; color: #fff; }
                .badge-info { background: #667eea; color: #fff; }
                
                .footer {
                    text-align: center;
                    margin-top: 25px;
                    padding-top: 15px;
                    border-top: 2px solid #e2e8f0;
                    color: #a0aec0;
                    font-size: 12px;
                }
                
                .footer p {
                    margin: 3px 0;
                }
                
                .summary-row {
                    background: #f0f4ff !important;
                    font-weight: 600;
                }
                
                .summary-row td {
                    border-top: 2px solid #667eea;
                }
                
                .no-data {
                    text-align: center;
                    padding: 40px;
                    color: #a0aec0;
                    font-size: 16px;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 40px;
                    color: #a0aec0;
                }
                
                .btn, .badge-in-stock, .badge-low-stock, .badge-out-of-stock {
                    display: none !important;
                }
                
                @media print {
                    body { padding: 15px; }
                    .no-print { display: none !important; }
                    table { font-size: 11px; }
                    table th, table td { padding: 5px 8px; }
                    .header { margin-bottom: 12px; }
                    .header h1 { font-size: 20px; }
                }
                
                @media (max-width: 600px) {
                    body { padding: 10px; }
                    table { font-size: 11px; }
                    table th, table td { padding: 4px 6px; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1><i class="fas fa-store"></i> ${title}</h1>
                <div class="subtitle">Sistema de Ventas</div>
                <div class="info-row">
                    <span>📅 ${new Date().toLocaleString('es-MX')}</span>
                    <span>👤 ${window.currentUser?.email || 'Sistema'}</span>
                    ${options.info ? `<span>📋 ${options.info}</span>` : ''}
                </div>
            </div>

            <div class="table-container">
                ${content.innerHTML}
            </div>

            <div class="footer">
                <p>Documento generado por Sistema de Ventas</p>
                <p>${new Date().toLocaleString('es-MX')}</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 2000);
                };
                setTimeout(function() {
                    if (!window.closed) {
                        window.close();
                    }
                }, 30000);
            <\/script>
        </body>
        </html>
    `);

    printWindow.document.close();
};

// ============================================
// 2. EXPORTAR A CSV
// ============================================

export const exportToCSV = (data, filename, headers) => {
    try {
        if (!data || data.length === 0) {
            showNotification('❌ No hay datos para exportar', 'error');
            return;
        }

        // Crear contenido CSV
        let csvContent = headers.join(',') + '\n';
        
        data.forEach(row => {
            const values = headers.map(header => {
                let value = row[header] !== undefined ? row[header] : '';
                const strValue = String(value).replace(/"/g, '""');
                return `"${strValue}"`;
            });
            csvContent += values.join(',') + '\n';
        });
        
        // Crear archivo y descargar (con BOM para UTF-8)
        const blob = new Blob(['\uFEFF' + csvContent], { 
            type: 'text/csv;charset=utf-8;' 
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        showNotification('✅ Archivo CSV generado correctamente', 'success');
        
    } catch (error) {
        console.error('Error al exportar CSV:', error);
        showNotification('❌ Error al generar CSV', 'error');
    }
};

// ============================================
// 3. EXPORTAR PRODUCTOS A CSV
// ============================================

export const exportProductsToCSV = async () => {
    try {
        const products = await getProducts();
        
        if (!products || products.length === 0) {
            showNotification('❌ No hay productos para exportar', 'error');
            return;
        }
        
        const headers = ['Producto', 'Categoría', 'Tipo', 'Costo', 'Precio Venta', 'Stock', 'Valor Inventario'];
        
        const data = products.map(p => ({
            'Producto': p.name,
            'Categoría': p.categoria || 'Sin categoría',
            'Tipo': p.type === 'batch' ? `Lote (${p.batchSize} uds)` : 'Pieza',
            'Costo': p.cost || 0,
            'Precio Venta': getPriceAsNumber(p) || 0,
            'Stock': p.stock || 0,
            'Valor Inventario': (p.stock || 0) * getCostPerPiece(p)
        }));
        
        exportToCSV(data, `productos_${new Date().toISOString().slice(0,10)}`, headers);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al exportar productos', 'error');
    }
};

// ============================================
// 4. EXPORTAR INVENTARIO A CSV
// ============================================

export const exportInventoryToCSV = async () => {
    try {
        const products = await getProducts();
        
        if (!products || products.length === 0) {
            showNotification('❌ No hay inventario para exportar', 'error');
            return;
        }
        
        const headers = ['Producto', 'Tipo', 'Stock', 'Costo Unitario', 'Valor Total', 'Estado'];
        
        const data = products.map(p => {
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
        
        exportToCSV(data, `inventario_${new Date().toISOString().slice(0,10)}`, headers);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al exportar inventario', 'error');
    }
};

// ============================================
// 5. EXPORTAR VENTAS A CSV
// ============================================

export const exportSalesToCSV = async () => {
    try {
        const sales = await getSales();
        
        if (!sales || sales.length === 0) {
            showNotification('❌ No hay ventas para exportar', 'error');
            return;
        }
        
        const headers = ['Fecha', 'Producto(s)', 'Cantidad', 'Total', 'Usuario'];
        
        const data = sales.map(s => {
            let productsList = '';
            let totalItems = 0;
            
            if (s.items && Array.isArray(s.items)) {
                productsList = s.items.map(item => item.productName).join(', ');
                totalItems = s.items.reduce((sum, item) => sum + item.quantity, 0);
            } else {
                productsList = s.productName || 'Producto desconocido';
                totalItems = s.quantity || 0;
            }
            
            let dateStr = 'Fecha desconocida';
            if (s.createdAt) {
                if (typeof s.createdAt === 'object' && s.createdAt !== null && typeof s.createdAt.toDate === 'function') {
                    dateStr = formatDate(s.createdAt.toDate());
                } else if (typeof s.createdAt === 'string') {
                    dateStr = formatDate(s.createdAt);
                } else if (s.createdAt.seconds) {
                    dateStr = formatDate(new Date(s.createdAt.seconds * 1000));
                }
            } else if (s.saleDate) {
                dateStr = formatDate(s.saleDate);
            }
            
            return {
                'Fecha': dateStr,
                'Producto(s)': productsList,
                'Cantidad': totalItems,
                'Total': s.total || s.totalPrice || 0,
                'Usuario': s.user || 'Sistema'
            };
        });
        
        exportToCSV(data, `ventas_${new Date().toISOString().slice(0,10)}`, headers);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al exportar ventas', 'error');
    }
};

// ============================================
// 6. EXPORTAR FINANZAS A CSV
// ============================================

export const exportFinancesToCSV = async () => {
    try {
        const withdrawals = await getCashWithdrawals();
        
        if (!withdrawals || withdrawals.length === 0) {
            showNotification('❌ No hay retiros para exportar', 'error');
            return;
        }
        
        const headers = ['Fecha', 'Descripción', 'Cantidad', 'Usuario'];
        
        const data = withdrawals.map(w => {
            let dateStr = 'Fecha desconocida';
            if (w.createdAt) {
                if (typeof w.createdAt === 'object' && w.createdAt !== null && typeof w.createdAt.toDate === 'function') {
                    dateStr = formatDate(w.createdAt.toDate());
                } else if (typeof w.createdAt === 'string') {
                    dateStr = formatDate(w.createdAt);
                } else if (w.createdAt.seconds) {
                    dateStr = formatDate(new Date(w.createdAt.seconds * 1000));
                }
            } else if (w.date) {
                dateStr = formatDate(w.date);
            }
            
            return {
                'Fecha': dateStr,
                'Descripción': w.description || 'Retiro de efectivo',
                'Cantidad': parseFloat(w.amount) || 0,
                'Usuario': w.user || 'Sistema'
            };
        });
        
        exportToCSV(data, `finanzas_${new Date().toISOString().slice(0,10)}`, headers);
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('❌ Error al exportar finanzas', 'error');
    }
};

// ============================================
// 7. REGISTRAR FUNCIONES GLOBALES
// ============================================

window.printToPDF = printToPDF;
window.exportProductsToCSV = exportProductsToCSV;
window.exportInventoryToCSV = exportInventoryToCSV;
window.exportSalesToCSV = exportSalesToCSV;
window.exportFinancesToCSV = exportFinancesToCSV;
window.exportToCSV = exportToCSV;