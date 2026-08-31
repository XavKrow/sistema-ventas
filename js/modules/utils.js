// ============================================
// UTILIDADES GENERALES
// ============================================

/**
 * Redondear a 2 decimales
 */
export const roundToTwo = (num) => {
    if (isNaN(num) || num === null || num === undefined) return 0;
    return parseFloat(Number(num).toFixed(2));
};

/**
 * Formatear moneda (Pesos Mexicanos)
 */
export const formatCurrency = (amount) => {
    if (isNaN(amount)) amount = 0;
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2
    }).format(amount);
};

/**
 * Formatear fecha
 */
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Calcular precio de venta sugerido
 */
export const calculateSalePrice = (cost, type, batchSize) => {
    let price;
    if (type === 'batch' && batchSize && batchSize > 0) {
        price = (cost / batchSize) * 1.35;
    } else {
        price = cost * 1.35;
    }
    return roundToTwo(price);
};

/**
 * Obtener precio como número
 */
export const getPriceAsNumber = (product) => {
    if (product.priceStr !== undefined && product.priceStr !== null) {
        const price = parseFloat(product.priceStr);
        if (!isNaN(price) && price > 0) return price;
    }
    if (product.price !== undefined && product.price !== null) {
        const price = Number(product.price);
        if (!isNaN(price) && price > 0) return price;
    }
    return 0;
};

/**
 * Calcular costo por pieza (para lotes)
 */
export const getCostPerPiece = (product) => {
    if (product.type === 'batch' && product.batchSize && product.batchSize > 0) {
        return product.cost / product.batchSize;
    }
    return product.cost;
};

/**
 * Mostrar notificación
 * ✅ Mejorada con iconos según el tipo
 */
export const showNotification = (message, type = 'success') => {
    const config = {
        success: { icon: '✅', bg: '#48bb78' },
        error: { icon: '❌', bg: '#f56565' },
        warning: { icon: '⚠️', bg: '#ed8936' },
        info: { icon: 'ℹ️', bg: '#4299e1' }
    };
    
    const selected = config[type] || config.info;
    
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        background: selected.bg,
        color: 'white',
        borderRadius: '8px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
        zIndex: '1001',
        fontWeight: '600',
        animation: 'slideIn 0.3s ease',
        maxWidth: '90%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    });
    notification.innerHTML = `<span style="font-size: 20px;">${selected.icon}</span> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3500);
};