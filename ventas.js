import { db } from './firebase-init.js';
import { 
    collection, 
    getDocs, 
    doc, 
    getDoc, 
    writeBatch, 
    Timestamp ,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const productListContainer = document.querySelector('.product-list');
    const cartItemsList = document.getElementById('cartItems');
    const totalAmountSpan = document.getElementById('totalAmount');
    const checkoutBtn = document.querySelector('.checkout-btn');
    const cancelBtn = document.querySelector('.cancel-btn');
    const searchInput = document.getElementById('searchInput');
    const clientSelect = document.getElementById('clientSelect');
    const creditCheck = document.getElementById('creditCheck');
    const bulkModal = document.getElementById('bulkModal');
    const bulkForm = document.getElementById('bulkForm');
    const bulkQuantityInput = document.getElementById('bulkQuantity');
    const bulkSubtotalDisplay = document.getElementById('bulkSubtotal');
    const btnScanCamera = document.getElementById('btnScanCamera');
    const scannerModal = document.getElementById('scannerModal');
    const closeScannerBtn = document.getElementById('closeScanner');
    let html5QrcodeScanner = null;
    let currentBulkProduct = null;

    const loadClients = async () => {
        try {
            const snapshot = await getDocs(collection(db, "clientes"));
            snapshot.forEach(doc => {
                const client = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = client.nombre;
                clientSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error cargando clientes:", error);
        }
    };
    loadClients();

    let cart = []; 
    let allProducts = []; 

    // --- 1. CARGA DE PRODUCTOS (GET) ---
    const fetchProducts = async () => {
        try {
            productListContainer.innerHTML = '<p>Cargando inventario...</p>';
            const querySnapshot = await getDocs(collection(db, "productos"));
            
            allProducts = []; // Reiniciamos el array local
            querySnapshot.forEach((doc) => {
                // Guardamos el ID de firestore y los datos
                allProducts.push({ id: doc.id, ...doc.data() });
            });

            renderProducts(allProducts);
        } catch (error) {
            console.error("Error cargando productos:", error);
            productListContainer.innerHTML = '<p style="color:red">Error de conexión con Firebase</p>';
        }
    };

    // --- 2. RENDERIZADO (IGUAL QUE ANTES) ---
    const renderProducts = (products) => {
        productListContainer.innerHTML = '';
        if (products.length === 0) {
            productListContainer.innerHTML = '<p>No se encontraron productos.</p>';
            return;
        }
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // Validamos que haya stock visualmente
            const stockDisplay = product.stock > 0 ? `Stock: ${product.stock}` : '<span style="color:red">Agotado</span>';
            const img = product.imagenUrl || 'https://placehold.co/100x100/e2e8f0/e2e8f0?text=Sin+Img';
            card.innerHTML = `
                <img src="${img}" alt="${product.nombre}" style="width: 100%; height: 100px; object-fit: cover;">
                <div class="product-info">
                    <h4>${product.nombre}</h4>
                    <p>$${product.precio_venta.toFixed(2)}</p>
                    <small>${stockDisplay}</small>
                </div>
               `;
            
            // Solo permite click si hay stock
            if(product.stock > 0) {
                card.addEventListener('click', () => checkProductType(product));
            } else {
                card.style.opacity = "0.6";
                card.style.cursor = "not-allowed";
            }
            productListContainer.appendChild(card);
        });
    };

    const checkProductType = (product) => {
            // Unidades que consideramos "a granel"
            const unidadesGranel = ['Kilogramo', 'Litro', 'Granel', 'Metro'];

            if (unidadesGranel.includes(product.unidad)) {
                openBulkModal(product);
            } else {
                addToCart(product, 1); // Si es pieza, agrega 1 directo
            }
        };
    
        const openBulkModal = (product) => {
        currentBulkProduct = product;
        
        document.getElementById('bulkProductName').textContent = product.nombre;
        document.getElementById('bulkProductPrice').textContent = `$${product.precio_venta.toFixed(2)}`;
        document.getElementById('bulkProductId').value = product.id;
        document.getElementById('bulkUnitLabel').textContent = product.unidad === 'Litro' ? 'L' : 'Kg';
        
        bulkQuantityInput.value = ''; // Limpiar
        bulkSubtotalDisplay.textContent = '$0.00';
        
        bulkModal.style.display = 'flex';
        bulkQuantityInput.focus(); // Poner el cursor listo para escribir
    };

    // Calcular subtotal en tiempo real mientras escribes
    bulkQuantityInput.addEventListener('input', () => {
        const qty = parseFloat(bulkQuantityInput.value) || 0;
        const price = currentBulkProduct ? currentBulkProduct.precio_venta : 0;
        bulkSubtotalDisplay.textContent = `$${(qty * price).toFixed(2)}`;
    });

    // Confirmar agregado a granel
    bulkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const qty = parseFloat(bulkQuantityInput.value);
        if (qty > 0 && currentBulkProduct) {
            addToCart(currentBulkProduct, qty);
            bulkModal.style.display = 'none';
            currentBulkProduct = null;
        }
    });

    const startCamera = async () => {
        console.log("Intentando abrir cámara..."); // Debug
        
        // Verificar si la librería cargó
        if (typeof Html5Qrcode === 'undefined') {
            alert("Error: La librería del escáner no se cargó correctamente. Revisa tu conexión a internet.");
            return;
        }

        scannerModal.style.display = 'flex';

        // Si ya había un escáner corriendo, limpiarlo
        if (html5QrcodeScanner) {
            await html5QrcodeScanner.clear();
        }

        html5QrcodeScanner = new Html5Qrcode("reader");

        try {
            // Intentar iniciar la cámara
            await html5QrcodeScanner.start(
                { facingMode: "environment" }, // Preferir cámara trasera
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                    // --- CÓDIGO LEÍDO CON ÉXITO ---
                    console.log(`Código escaneado: ${decodedText}`);
                    
                    // Sonido de "beep" (opcional)
                    // new Audio('https://www.soundjay.com/button/beep-07.mp3').play().catch(e=>{});

                    stopCamera(); // Cerrar cámara

                    // Buscar producto en la lista cargada
                    const producto = allProducts.find(p => p.codigo_barras === decodedText);
                    
                    if (producto) {
                        checkProductType(producto); // Agregar al carrito
                        // Opcional: alert(`Agregado: ${producto.nombre}`);
                    } else {
                        alert(`El código "${decodedText}" no existe en el inventario.`);
                    }
                },
                (errorMessage) => {
                    // Ignorar errores de "no se detecta código en este frame"
                }
            );
        } catch (err) {
            console.error("Error crítico de cámara:", err);
            scannerModal.style.display = 'none';
            
            // MENSAJES DE ERROR AMIGABLES
            if (err.name === 'NotAllowedError') {
                alert("Permiso denegado: Debes permitir el acceso a la cámara en tu navegador.");
            } else if (err.name === 'NotFoundError') {
                alert("No se encontró ninguna cámara en este dispositivo.");
            } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
                 alert("SEGURIDAD: La cámara solo funciona en sitios seguros (HTTPS) o en localhost. Si estás en celular usando IP, no funcionará. Debes hacer 'firebase deploy'.");
            } else {
                alert("Error al iniciar cámara: " + err);
            }
        }
    };

    const stopCamera = () => {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                scannerModal.style.display = 'none';
            }).catch(err => {
                console.error("Error al detener:", err);
                scannerModal.style.display = 'none';
            });
        } else {
            scannerModal.style.display = 'none';
        }
    };

    // Eventos
    if (btnScanCamera) {
        btnScanCamera.addEventListener('click', startCamera);
        console.log("Botón de escáner detectado y activo.");
    } else {
        console.error("ERROR: No se encontró el botón con ID 'btnScanCamera' en el HTML.");
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopCamera);
    }

    // Cerrar modal
    document.getElementById('closeBulkModal').onclick = () => bulkModal.style.display = 'none';
    // LÓGICA PARA PISTOLA USB (Detectar "Enter")
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const codigo = searchInput.value.trim();
            if(!codigo) return;

            // Buscar coincidencia exacta por código de barras
            const prod = allProducts.find(p => p.codigo_barras === codigo);

            if (prod) {
                checkProductType(prod); // Agregar al carrito
                searchInput.value = ''; // Limpiar para el siguiente
                renderProducts(allProducts); // Restaurar vista si se filtró
            }
        }
    });
    // --- 3. LOGICA DEL CARRITO (LOCAL) ---
    const addToCart = (product, quantityToAdd) => {
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // Verificación de Stock (Soporta decimales)
            if ((existingItem.quantity + quantityToAdd) <= product.stock) {
                existingItem.quantity += quantityToAdd;
                
                // Truco JS: Redondear a 3 decimales para evitar 0.300000004
                existingItem.quantity = Math.round(existingItem.quantity * 1000) / 1000;
            } else {
                alert(`Stock insuficiente. Solo quedan ${product.stock} ${product.unidad}`);
                return;
            }
        } else {
            if (product.stock >= quantityToAdd) {
                cart.push({ ...product, quantity: quantityToAdd });
            } else {
                alert('Stock insuficiente.');
                return;
            }
        }
        renderCart();
    };

    const removeFromCart = (productId) => {
        // En granel es confuso restar "1", mejor borramos la línea y que lo agreguen de nuevo
        const itemIndex = cart.findIndex(item => item.id === productId);
        if (itemIndex > -1) {
            cart.splice(itemIndex, 1);
        }
        renderCart();
    };

    const renderCart = () => {
        cartItemsList.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartItemsList.innerHTML = '<li>El carrito está vacío.</li>';
            totalAmountSpan.textContent = '$0.00';
            return;
        }

        cart.forEach(item => {
            const li = document.createElement('li');
            const subtotal = item.precio_venta * item.quantity;
            
            // Formato inteligente: Si es entero muestra "2", si es decimal muestra "0.250"
            const qtyDisplay = Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(3);
            const unitDisplay = item.unidad === 'Kilogramo' ? 'kg' : (item.unidad === 'Litro' ? 'L' : '');

            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%">
                    <div style="flex-grow: 1;">
                        <strong>${item.nombre}</strong><br>
                        <small style="color: #666;">${qtyDisplay} ${unitDisplay} x $${item.precio_venta}</small>
                    </div>
                    <span style="font-weight:bold;">$${subtotal.toFixed(2)}</span>
                </div>
            `;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'X';
            removeBtn.className = 'remove-item-btn'; // Asegúrate de tener estilos para esto (rojo pequeño)
            removeBtn.style.marginRight = "10px";
            removeBtn.onclick = () => removeFromCart(item.id); // Tu función remove original sirve, pero bórralo completo mejor
            
            li.prepend(removeBtn);
            cartItemsList.appendChild(li);
            total += subtotal;
        });

        totalAmountSpan.textContent = `$${total.toFixed(2)}`;
    };

    // --- 4. CHECKOUT (LÓGICA CRÍTICA CON BATCH) ---
    const handleCheckout = async () => {
        if (cart.length === 0) {
            alert('El carrito está vacío.');
            return;
        }

        const isCredit = creditCheck.checked;
        const clientId = clientSelect.value;
        const clientName = clientSelect.options[clientSelect.selectedIndex].text;

        if (isCredit && !clientId) {
            return alert("Para ventas a crédito, debes seleccionar un cliente registrado.");
        }

        checkoutBtn.disabled = true; // Evitar doble click
        checkoutBtn.textContent = "Procesando...";

        try {
            // A) Crear una instancia de Batch (Lote)
            const batch = writeBatch(db);

            // B) Preparar referencia para la nueva venta
            // Firebase genera el ID automáticamente con doc(collection(...))
            const ventaRef = doc(collection(db, "ventas"));

            // C) Calcular total y preparar items para guardar
            let totalVenta = 0;
            const itemsParaGuardar = [];

            // D) Iterar sobre el carrito para:
            //    1. Verificar stock actual en BD (Lectura fresca)
            //    2. Preparar la resta de stock en el Batch
            for (const item of cart) {
                const productRef = doc(db, "productos", item.id);
                const productSnap = await getDoc(productRef);

                if (!productSnap.exists()) {
                    throw new Error(`El producto ${item.nombre} ya no existe en la base de datos.`);
                }

                const currentStock = productSnap.data().stock;

                if (currentStock < item.quantity) {
                    throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${currentStock}`);
                }

                // Paso Clave: Agregar la operación de actualización al Batch
                batch.update(productRef, { 
                    stock: currentStock - item.quantity 
                }); 

                // Agregar al array de la venta
                itemsParaGuardar.push({
                    producto_id: item.id,
                    nombre: item.nombre, // Guardamos nombre por si luego borran el producto
                    precio_unitario: item.precio_venta,
                    cantidad: item.quantity,
                    subtotal: item.precio_venta * item.quantity
                });

                totalVenta += item.precio_venta * item.quantity;
            }

            //Si es crédito, aumentar la deuda
            if (isCredit && clientId) {
                const clientRef = doc(db, "clientes", clientId);
                // Usamos increment para sumar atómicamente
                batch.update(clientRef, { deuda: increment(totalVenta) });
            }

            // E) Agregar la creación de la Venta al Batch
            const ventaData = {
                fecha: Timestamp.now(), // Formato de fecha nativo de Firebase
                total: totalVenta,
                items: itemsParaGuardar,
                tipo_pago: isCredit ? 'Crédito' : 'Efectivo',
                cliente_id: clientId || 'publico_general',
                cliente_nombre: clientId ? clientName : 'Público General',
                usuario: 'Admin' // O el usuario logueado
            };

            batch.set(ventaRef, ventaData);

            // F) Ejecutar todas las operaciones atómicamente
            await batch.commit();

            alert(isCredit 
                ? `Venta cargada a la cuenta de ${clientName} por $${totalVenta}` 
                : 'Venta realizada con éxito');

            // G) Éxito
            alert('¡Venta realizada con éxito!');
            cart = [];
            renderCart();
            fetchProducts(); // Recargar productos para ver stock actualizado
            creditCheck.checked = false;
            clientSelect.value = "";

        } catch (error) {
            console.error("Error en checkout:", error);
            alert(`Error: ${error.message}`);
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = "Pagar";
        }
    };

    // --- 5. BÚSQUEDA (FILTRO LOCAL) ---
    const handleSearch = () => {
        const query = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(product => 
            product.nombre.toLowerCase().includes(query) || 
            (product.codigo_barras && product.codigo_barras.includes(query))
        );
        renderProducts(filteredProducts);
    };

    // Listeners
    checkoutBtn.addEventListener('click', handleCheckout);
    cancelBtn.addEventListener('click', () => {
        if(confirm("¿Cancelar venta?")) { cart = []; renderCart(); }
    });
    searchInput.addEventListener('input', handleSearch);

    // Inicializar
    fetchProducts();
});
