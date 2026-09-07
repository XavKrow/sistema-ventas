// ============================================
// 🔥 CONFIGURACIÓN DE FIREBASE
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyDKo8t7cH2D26c-JWWmmXxG-tZo8H51_dg",
    authDomain: "sistema-ventas-b0a0a.firebaseapp.com",
    projectId: "sistema-ventas-b0a0a",
    storageBucket: "sistema-ventas-b0a0a.firebasestorage.app",
    messagingSenderId: "500029020842",
    appId: "1:500029020842:web:df579c098d210a4648ced3"
};

// ============================================
// IMPORTS DE FIREBASE SDK
// ============================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    getDoc,
    addDoc, 
    setDoc,
    updateDoc, 
    deleteDoc, 
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ============================================
// INICIALIZAR FIREBASE
// ============================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ============================================
// NOMBRES DE COLECCIONES
// ============================================
const COLLECTIONS = {
    products: 'products',
    sales: 'sales',
    inventoryMovements: 'inventoryMovements',
    cashWithdrawals: 'cashWithdrawals',
    categories: 'categories'
};

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Error de login:', error);
        return { success: false, error: error.message };
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error: error.message };
    }
}

function onAuthChange(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

// ============================================
// FUNCIONES CRUD - PRODUCTOS
// ============================================

async function getProducts() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.products));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        return products;
    } catch (error) {
        console.error('Error al obtener productos:', error);
        return [];
    }
}

async function saveProduct(product, id = null) {
    try {
        const cleanNumber = (value) => {
            if (value === null || value === undefined) return 0;
            const num = Number(value);
            if (isNaN(num)) return 0;
            return parseFloat(num.toFixed(2));
        };

        const cleanProduct = {
            name: String(product.name || '').trim(),
            description: String(product.description || '').trim(),
            categoria: String(product.categoria || ''),
            type: String(product.type || 'unit'),
            batchSize: product.batchSize ? Number(product.batchSize) : null,
            cost: cleanNumber(product.cost),
            priceStr: String(cleanNumber(product.price)),
            price: cleanNumber(product.price),
            stock: Number(product.stock) || 0
        };

        if (id) {
            const docRef = doc(db, COLLECTIONS.products, id);
            await setDoc(docRef, {
                ...cleanProduct,
                updatedAt: serverTimestamp()
            }, { merge: true });
            return { id, ...cleanProduct };
        } else {
            const docRef = await addDoc(collection(db, COLLECTIONS.products), {
                ...cleanProduct,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...cleanProduct };
        }
    } catch (error) {
        console.error('Error al guardar producto:', error);
        throw error;
    }
}

async function deleteProduct(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.products, id));
        return true;
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        return false;
    }
}

function listenProducts(callback) {
    return onSnapshot(collection(db, COLLECTIONS.products), (snapshot) => {
        const products = [];
        snapshot.forEach((doc) => {
            products.push({ id: doc.id, ...doc.data() });
        });
        callback(products);
    }, (error) => {
        console.error('Error en listener de productos:', error);
    });
}

// ============================================
// FUNCIONES CRUD - VENTAS
// ============================================

async function getSales() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.sales));
        const sales = [];
        querySnapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() });
        });
        return sales;
    } catch (error) {
        console.error('Error al obtener ventas:', error);
        return [];
    }
}

async function saveSale(sale) {
    try {
        const cleanNumber = (value) => {
            if (value === null || value === undefined) return 0;
            const num = Number(value);
            if (isNaN(num)) return 0;
            return parseFloat(num.toFixed(2));
        };

        const cleanSale = {
            productId: String(sale.productId || ''),
            productName: String(sale.productName || ''),
            quantity: Number(sale.quantity) || 0,
            unitPrice: cleanNumber(sale.unitPrice),
            totalPrice: cleanNumber(sale.totalPrice),
            saleDate: sale.saleDate || new Date().toISOString(),
            user: String(sale.user || 'Sistema')
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.sales), {
            ...cleanSale,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...cleanSale };
    } catch (error) {
        console.error('Error al guardar venta:', error);
        throw error;
    }
}

/**
 * Guardar venta con múltiples productos
 */
async function saveMultiSale(saleData) {
    try {
        const cleanSale = {
            items: saleData.items.map(item => ({
                productId: String(item.productId || ''),
                productName: String(item.productName || ''),
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                totalPrice: Number(item.totalPrice) || 0
            })),
            subtotal: Number(saleData.subtotal) || 0,
            total: Number(saleData.total) || 0,
            saleDate: saleData.saleDate || new Date().toISOString(),
            user: String(saleData.user || 'Sistema')
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.sales), {
            ...cleanSale,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...cleanSale };
    } catch (error) {
        console.error('Error al guardar venta múltiple:', error);
        throw error;
    }
}

/**
 * Deshacer una venta (revertir stock y eliminar venta)
 */
async function undoSale(saleId) {
    try {
        const saleDoc = await getDoc(doc(db, COLLECTIONS.sales, saleId));
        if (!saleDoc.exists()) {
            throw new Error('Venta no encontrada');
        }
        
        const sale = { id: saleDoc.id, ...saleDoc.data() };
        
        for (const item of sale.items || []) {
            const productRef = doc(db, COLLECTIONS.products, item.productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
                const product = productDoc.data();
                const newStock = (product.stock || 0) + item.quantity;
                
                await updateDoc(productRef, {
                    stock: newStock,
                    updatedAt: serverTimestamp()
                });
                
                await saveInventoryMovement({
                    productId: item.productId,
                    productName: item.productName,
                    quantity: item.quantity,
                    operation: 'undo_sale',
                    timestamp: new Date().toISOString(),
                    user: 'Sistema (Deshacer venta)'
                });
            }
        }
        
        await deleteDoc(doc(db, COLLECTIONS.sales, saleId));
        return { success: true, sale: sale };
    } catch (error) {
        console.error('Error al deshacer venta:', error);
        throw error;
    }
}

function listenSales(callback) {
    const q = query(collection(db, COLLECTIONS.sales), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const sales = [];
        snapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() });
        });
        callback(sales);
    }, (error) => {
        console.error('Error en listener de ventas:', error);
    });
}

// ============================================
// FUNCIONES - MOVIMIENTOS DE INVENTARIO
// ============================================

async function saveInventoryMovement(movement) {
    try {
        const cleanMovement = {
            productId: String(movement.productId || ''),
            productName: String(movement.productName || ''),
            quantity: Number(movement.quantity) || 0,
            operation: String(movement.operation || 'add'),
            timestamp: movement.timestamp || new Date().toISOString(),
            user: String(movement.user || 'Sistema'),
            note: String(movement.note || '')
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.inventoryMovements), {
            ...cleanMovement,
            createdAt: serverTimestamp()
        });
        return { id: docRef.id, ...cleanMovement };
    } catch (error) {
        console.error('Error al guardar movimiento de inventario:', error);
        throw error;
    }
}

// ✅ Obtener todos los movimientos de inventario
async function getInventoryMovements() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.inventoryMovements));
        const movements = [];
        querySnapshot.forEach((doc) => {
            movements.push({ id: doc.id, ...doc.data() });
        });
        return movements;
    } catch (error) {
        console.error('Error al obtener movimientos de inventario:', error);
        return [];
    }
}

// ✅ Obtener movimientos de un producto específico
async function getInventoryMovementsByProduct(productId) {
    try {
        const q = query(
            collection(db, COLLECTIONS.inventoryMovements),
            where('productId', '==', productId),
            orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const movements = [];
        querySnapshot.forEach((doc) => {
            movements.push({ id: doc.id, ...doc.data() });
        });
        return movements;
    } catch (error) {
        console.error('Error al obtener movimientos del producto:', error);
        return [];
    }
}

// ============================================
// FUNCIONES PARA RETIROS DE EFECTIVO
// ============================================

async function saveCashWithdrawal(withdrawal) {
    try {
        const cleanAmount = Number(withdrawal.amount);
        if (isNaN(cleanAmount) || cleanAmount <= 0) {
            throw new Error('La cantidad debe ser un número válido mayor a 0');
        }

        const amountStr = cleanAmount.toFixed(2);

        const cleanWithdrawal = {
            amount: amountStr,
            description: String(withdrawal.description || 'Retiro de efectivo'),
            user: String(withdrawal.user || 'Sistema')
        };

        const docRef = await addDoc(collection(db, COLLECTIONS.cashWithdrawals), {
            ...cleanWithdrawal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        return { id: docRef.id, ...cleanWithdrawal };
    } catch (error) {
        console.error('❌ Error al guardar retiro:', error);
        throw error;
    }
}

async function getCashWithdrawals() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.cashWithdrawals));
        const withdrawals = [];
        querySnapshot.forEach((doc) => {
            withdrawals.push({ id: doc.id, ...doc.data() });
        });
        return withdrawals;
    } catch (error) {
        console.error('Error al obtener retiros:', error);
        return [];
    }
}

async function deleteCashWithdrawal(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.cashWithdrawals, id));
        return true;
    } catch (error) {
        console.error('Error al eliminar retiro:', error);
        return false;
    }
}

// ✅ NUEVA FUNCIÓN: Obtener total de retiros
async function getTotalWithdrawals() {
    try {
        const withdrawals = await getCashWithdrawals();
        let total = 0;
        withdrawals.forEach(w => {
            const amount = typeof w.amount === 'string' ? parseFloat(w.amount) : Number(w.amount);
            if (!isNaN(amount)) total += amount;
        });
        return total;
    } catch (error) {
        console.error('Error al calcular total retiros:', error);
        return 0;
    }
}

// ✅ NUEVA FUNCIÓN: Obtener total de ventas
async function getTotalSales() {
    try {
        const sales = await getSales();
        let total = 0;
        sales.forEach(s => {
            const amount = s.total || s.totalPrice || 0;
            total += Number(amount);
        });
        return total;
    } catch (error) {
        console.error('Error al calcular total ventas:', error);
        return 0;
    }
}

// ============================================
// FUNCIONES CRUD - CATEGORÍAS
// ============================================

// Obtener todas las categorías
async function getCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.categories));
        const categories = [];
        querySnapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        return categories;
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        return [];
    }
}

// Guardar categoría (crear o actualizar)
async function saveCategory(category, id = null) {
    try {
        const cleanCategory = {
            name: String(category.name || '').trim(),
            icon: String(category.icon || '📦'),
            color: String(category.color || '#a0aec0')
        };

        if (id) {
            const docRef = doc(db, COLLECTIONS.categories, id);
            await updateDoc(docRef, {
                ...cleanCategory,
                updatedAt: serverTimestamp()
            });
            return { id, ...cleanCategory };
        } else {
            const docRef = await addDoc(collection(db, COLLECTIONS.categories), {
                ...cleanCategory,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { id: docRef.id, ...cleanCategory };
        }
    } catch (error) {
        console.error('Error al guardar categoría:', error);
        throw error;
    }
}

// Eliminar categoría
async function deleteCategory(id) {
    try {
        await deleteDoc(doc(db, COLLECTIONS.categories, id));
        return true;
    } catch (error) {
        console.error('Error al eliminar categoría:', error);
        return false;
    }
}

// Escuchar cambios en categorías (tiempo real)
function listenCategories(callback) {
    return onSnapshot(collection(db, COLLECTIONS.categories), (snapshot) => {
        const categories = [];
        snapshot.forEach((doc) => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        callback(categories);
    }, (error) => {
        console.error('Error en listener de categorías:', error);
    });
}

// ============================================
// EXPORTAR TODAS LAS FUNCIONES
// ============================================
export {
    db,
    auth,
    loginUser,
    logoutUser,
    onAuthChange,
    getProducts,
    saveProduct,
    deleteProduct,
    listenProducts,
    getSales,
    saveSale,
    saveMultiSale,
    undoSale,
    listenSales,
    saveInventoryMovement,
    getInventoryMovements,
    getInventoryMovementsByProduct,
    saveCashWithdrawal,
    getCashWithdrawals,
    deleteCashWithdrawal,
    getTotalWithdrawals,
    getTotalSales,
    getCategories,
    saveCategory,
    deleteCategory,
    listenCategories
};