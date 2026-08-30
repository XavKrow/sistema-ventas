// ============================================
// FINANZAS Y RETIROS
// ============================================

import { 
    getTotalSales, 
    getTotalWithdrawals, 
    getCashWithdrawals,
    saveCashWithdrawal, 
    deleteCashWithdrawal 
} from '../firebase-config.js';
import { formatCurrency, formatDate, showNotification } from './utils.js';

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentUser = null;

// ============================================
// RENDERIZAR RETIROS
// ============================================

export const renderWithdrawals = async () => {
    const container = document.getElementById('withdrawalsList');
    if (!container) return;
    
    try {
        const withdrawals = await getCashWithdrawals();
        
        if (!withdrawals || withdrawals.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No hay retiros registrados</p></div>';
            return;
        }
        
        let html = `
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Cantidad</th>
                            <th>Usuario</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        withdrawals.slice(0, 50).forEach(w => {
            const amount = typeof w.amount === 'string' ? parseFloat(w.amount) : Number(w.amount);
            
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
                if (typeof w.date === 'string') {
                    dateStr = formatDate(w.date);
                } else if (typeof w.date === 'object' && w.date !== null && typeof w.date.toDate === 'function') {
                    dateStr = formatDate(w.date.toDate());
                }
            }
            
            html += `
                <tr>
                    <td>${dateStr}</td>
                    <td>${w.description || 'Retiro de efectivo'}</td>
                    <td><strong style="color: #f56565;">-${formatCurrency(amount)}</strong></td>
                    <td>${w.user || 'Sistema'}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="window.undoWithdrawalHandler('${w.id}')">
                            ↩️ Deshacer
                        </button>
                    </td>
                </tr>
            `;
        });
        
        if (withdrawals.length > 50) {
            html += `
                <tr>
                    <td colspan="5" style="text-align:center; color:var(--text-muted);">
                        Mostrando 50 de ${withdrawals.length} retiros
                    </td>
                </tr>
            `;
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error al renderizar retiros:', error);
        container.innerHTML = '<div class="empty-state"><p>Error al cargar retiros</p></div>';
    }
};

// ============================================
// ACTUALIZAR PANEL FINANCIERO
// ============================================

export const updateFinancialPanel = async () => {
    try {
        const totalSales = await getTotalSales();
        const totalWithdrawals = await getTotalWithdrawals();
        const totalCash = totalSales - totalWithdrawals;
        
        const salesDisplay = document.getElementById('totalSalesDisplay');
        const withdrawalsDisplay = document.getElementById('totalWithdrawalsDisplay');
        const cashDisplay = document.getElementById('totalCashDisplay');
        
        if (salesDisplay) salesDisplay.textContent = formatCurrency(totalSales);
        if (withdrawalsDisplay) withdrawalsDisplay.textContent = formatCurrency(totalWithdrawals);
        if (cashDisplay) cashDisplay.textContent = formatCurrency(totalCash);
        
        await renderWithdrawals();
        
        return { totalSales, totalWithdrawals, totalCash };
    } catch (error) {
        console.error('Error al actualizar panel financiero:', error);
    }
};

// ============================================
// FUNCIONES DE RETIRO
// ============================================

export const openWithdrawModal = () => {
    document.getElementById('withdrawModal').style.display = 'flex';
    document.getElementById('withdrawAmount').value = '';
    document.getElementById('withdrawDescription').value = '';
    document.getElementById('withdrawMessage').textContent = '';
    document.getElementById('withdrawAmount').focus();
};

export const confirmWithdraw = async () => {
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const description = document.getElementById('withdrawDescription').value.trim() || 'Retiro de efectivo';
    const messageEl = document.getElementById('withdrawMessage');
    
    if (isNaN(amount) || amount <= 0) {
        messageEl.textContent = '❌ Ingresa una cantidad válida (mayor a 0)';
        messageEl.style.color = '#f56565';
        return;
    }
    
    const totalSales = await getTotalSales();
    const totalWithdrawals = await getTotalWithdrawals();
    const currentCash = totalSales - totalWithdrawals;
    
    if (amount > currentCash) {
        messageEl.textContent = `❌ No hay suficiente efectivo. Caja actual: ${formatCurrency(currentCash)}`;
        messageEl.style.color = '#f56565';
        return;
    }
    
    const amountStr = amount.toFixed(2);
    
    try {
        const confirmBtn = document.getElementById('confirmWithdrawBtn');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = '⏳ Procesando...';
        confirmBtn.disabled = true;
        
        await saveCashWithdrawal({
            amount: amountStr,
            description: description,
            user: currentUser?.email || 'Sistema'
        });
        
        document.getElementById('withdrawModal').style.display = 'none';
        showNotification(`✅ Retiro registrado: $${amountStr}`, 'success');
        await updateFinancialPanel();
        
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
        
    } catch (error) {
        console.error('❌ Error en retiro:', error);
        messageEl.textContent = '❌ Error al registrar retiro: ' + (error.message || '');
        messageEl.style.color = '#f56565';
        
        const confirmBtn = document.getElementById('confirmWithdrawBtn');
        confirmBtn.textContent = '✅ Confirmar Retiro';
        confirmBtn.disabled = false;
    }
};

export const undoWithdrawalHandler = async (withdrawalId) => {
    if (!confirm('¿Estás seguro de deshacer este retiro?\nEl dinero se devolverá a la caja.')) return;
    
    try {
        await deleteCashWithdrawal(withdrawalId);
        showNotification('✅ Retiro deshecho correctamente', 'success');
        await updateFinancialPanel();
    } catch (error) {
        console.error('Error al deshacer retiro:', error);
        showNotification('❌ Error al deshacer retiro', 'error');
    }
};

// ============================================
// SET CURRENT USER
// ============================================

export const setCurrentUser = (user) => {
    currentUser = user;
};

// ============================================
// EXPORTAR TODO
// ============================================

export { getCashWithdrawals };