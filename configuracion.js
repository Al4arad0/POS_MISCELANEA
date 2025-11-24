import { db } from './firebase-init.js';
import { doc, getDoc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const saveBtn = document.getElementById('saveSettingsBtn');
    
    // Inputs
    const storeName = document.getElementById('storeName');
    const storeAddress = document.getElementById('storeAddress');
    const ticketFooter = document.getElementById('ticketFooter');
    const taxRate = document.getElementById('taxRate');
    const lowStockThreshold = document.getElementById('lowStockThreshold');
    const allowNegativeStock = document.getElementById('allowNegativeStock');

    // Botones Exportar
    const exportSalesBtn = document.getElementById('exportSalesBtn');
    const exportInventoryBtn = document.getElementById('exportInventoryBtn');

    // --- 1. CARGAR CONFIGURACIÓN ACTUAL ---
    const loadSettings = async () => {
        try {
            const docRef = doc(db, "configuracion", "general"); // Usamos un ID fijo 'general'
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                storeName.value = data.nombre_tienda || '';
                storeAddress.value = data.direccion || '';
                ticketFooter.value = data.pie_ticket || '';
                taxRate.value = data.impuesto_porcentaje || 0;
                lowStockThreshold.value = data.stock_minimo_alerta || 5;
                allowNegativeStock.checked = data.permitir_stock_negativo || false;
            }
        } catch (error) {
            console.error("Error cargando configuración:", error);
        }
    };

    // --- 2. GUARDAR CONFIGURACIÓN ---
    saveBtn.addEventListener('click', async () => {
        saveBtn.textContent = "Guardando...";
        saveBtn.disabled = true;

        const settingsData = {
            nombre_tienda: storeName.value,
            direccion: storeAddress.value,
            pie_ticket: ticketFooter.value,
            impuesto_porcentaje: parseFloat(taxRate.value),
            stock_minimo_alerta: parseInt(lowStockThreshold.value),
            permitir_stock_negativo: allowNegativeStock.checked
        };

        try {
            // setDoc con {merge: true} crea el documento si no existe o actualiza campos
            await setDoc(doc(db, "configuracion", "general"), settingsData, { merge: true });
            alert("Configuración guardada exitosamente.");
        } catch (error) {
            console.error("Error guardando:", error);
            alert("Error al guardar configuración.");
        } finally {
            saveBtn.textContent = "Guardar Toda la Configuración";
            saveBtn.disabled = false;
        }
    });

    // --- 3. EXPORTAR DATOS (JSON) ---
    // Función genérica para descargar JSON
    const downloadJSON = (data, filename) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    exportSalesBtn.addEventListener('click', async () => {
        if(!confirm("¿Descargar historial completo de ventas?")) return;
        try {
            const querySnapshot = await getDocs(collection(db, "ventas"));
            const sales = [];
            querySnapshot.forEach(doc => sales.push({ id: doc.id, ...doc.data() }));
            
            const dateStr = new Date().toISOString().slice(0,10);
            downloadJSON(sales, `ventas_backup_${dateStr}.json`);
        } catch (error) {
            console.error(error);
            alert("Error al exportar ventas.");
        }
    });

    exportInventoryBtn.addEventListener('click', async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "productos"));
            const products = [];
            querySnapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
            
            const dateStr = new Date().toISOString().slice(0,10);
            downloadJSON(products, `inventario_backup_${dateStr}.json`);
        } catch (error) {
            console.error(error);
            alert("Error al exportar inventario.");
        }
    });

    // Inicializar
    loadSettings();
});
