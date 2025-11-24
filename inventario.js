import { db, storage} from './firebase-init.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    const inventoryList = document.getElementById('inventoryList');
    const newProductForm = document.getElementById('newProductForm');
    const proveedoresDatalist = document.getElementById('listaProveedores');
    const btnGenerar = document.getElementById('btnGenerarCodigo');
    const inputCodigo = document.getElementById('codigo_barras');
    const canvasCodigo = document.getElementById('barcodeCanvas');
    const btnEscanearInv = document.getElementById('btnEscanearInventario');
    const scannerModalInv = document.getElementById('scannerModal');
    const closeScannerInv = document.getElementById('closeScanner');
    const inputCodigoBarras = document.getElementById('codigo_barras');
    let html5QrcodeScannerInv = null;
    let currentScanTarget = null;
    const btnGenerarEdit = document.getElementById('btnGenerarEdit');
    const btnEscanearEdit = document.getElementById('btnEscanearEdit');
    const inputEditCodigo = document.getElementById('editCodigo');
    
    // Lista local para validar existencia de proveedores
    let nombresProveedoresValidos = [];

    const uploadImage = async (file) => {
        if (!file) {
            console.error("No se recibió ningún archivo.");
            return null;
        }
        
        console.log("Intentando subir archivo:", file.name); // <--- DEBUG

        try {
            const storageRef = ref(storage, `productos/${Date.now()}_${file.name}`);
            
            // Usamos uploadBytes y esperamos el resultado
            const snapshot = await uploadBytes(storageRef, file);
            console.log("Archivo subido!", snapshot); // <--- DEBUG

            const url = await getDownloadURL(storageRef);
            console.log("URL obtenida:", url); // <--- DEBUG
            
            return url;
        } catch (error) {
            // Imprime el error completo para saber qué es
            console.error("ERROR DETALLADO AL SUBIR:", error); 
            console.error("Código de error:", error.code);
            console.error("Mensaje:", error.message);
            
            alert("Error al subir la imagen: " + error.message);
            return null;
        }
    };

    const startInventoryCamera = async (targetInput) => {
        // Guardamos la referencia del input donde escribiremos
        currentScanTarget = targetInput;

        // 1. Mostrar modal (para que el div tenga tamaño)
        scannerModalInv.style.display = 'flex';

        // 2. Limpieza previa
        if (html5QrcodeScannerInv) {
            try { await html5QrcodeScannerInv.clear(); } catch (e) {}
        }

        // 3. Espera para móviles (Fix del paso anterior)
        setTimeout(async () => {
            html5QrcodeScannerInv = new Html5Qrcode("reader");

            try {
                await html5QrcodeScannerInv.start(
                    { facingMode: "environment" }, 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        // --- ÉXITO ---
                        console.log(`Leído: ${decodedText}`);
                        
                        // ESCRIBIR EN EL INPUT CORRECTO
                        if (currentScanTarget) {
                            currentScanTarget.value = decodedText;
                            // Efecto visual
                            currentScanTarget.style.backgroundColor = "#d4edda";
                            setTimeout(() => currentScanTarget.style.backgroundColor = "", 500);
                        }

                        stopInventoryCamera();
                    },
                    (errorMessage) => { /* Ignorar */ }
                );
            } catch (err) {
                console.error("Error cámara:", err);
                alert("Error al abrir cámara: " + err.message);
                scannerModalInv.style.display = 'none';
            }
        }, 300);
    };

    const stopInventoryCamera = () => {
        if (html5QrcodeScannerInv) {
            html5QrcodeScannerInv.stop().then(() => {
                html5QrcodeScannerInv.clear();
                scannerModalInv.style.display = 'none';
            }).catch(err => console.error(err));
        } else {
            scannerModalInv.style.display = 'none';
        }
    };

    // Eventos del escáner
    if (btnEscanearInv) {
        btnEscanearInv.addEventListener('click', () => {
            // Le decimos: "Escribe en el input de código principal"
            startInventoryCamera(inputCodigoBarras);
        });
    }
    if (btnEscanearEdit) {
        btnEscanearEdit.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir cualquier comportamiento raro
            alert("Botón presionado. Intentando abrir cámara..."); // <--- AGREGA ESTO PARA PROBAR
            
            // Le decimos: "Escribe en el input del modal de edición"
            startInventoryCamera(inputEditCodigo);
        });
    } else {
        console.error("ERROR: No se encontró el botón 'btnEscanearEdit' en el HTML");
    }
    if (closeScannerInv) {
        closeScannerInv.addEventListener('click', stopInventoryCamera);
    }

    if(btnGenerarEdit) {
    btnGenerarEdit.addEventListener('click', () => {
        const nuevoCodigo = generarCodigoUnico(); // Usamos la misma función que ya tenías
        inputEditCodigo.value = nuevoCodigo;
    });
    }

    inputCodigoBarras.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Evita el submit
            // Opcional: Mover el foco al siguiente campo (Nombre)
            document.getElementById('nombre').focus();
        }
    });
    // --- 1. CARGAR PROVEEDORES (Para el Select/Datalist) ---
    const loadSuppliersForSelect = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "proveedores"));
            proveedoresDatalist.innerHTML = ''; // Limpiar opciones anteriores
            nombresProveedoresValidos = []; // Reiniciar lista de validación

            querySnapshot.forEach((doc) => {
                const proveedor = doc.data();
                const nombre = proveedor.nombre; // Asumimos que el campo es 'nombre'
                
                // Agregar al datalist del HTML
                const option = document.createElement('option');
                option.value = nombre;
                proveedoresDatalist.appendChild(option);

                // Agregar a nuestra lista de validación en memoria
                nombresProveedoresValidos.push(nombre.toLowerCase()); // Guardamos en minúsculas para comparar fácil
            });
        } catch (error) {
            console.error("Error cargando lista de proveedores:", error);
        }
    };

    // --- 2. LEER PRODUCTOS (GET) ---
    const fetchProducts = async () => {
        inventoryList.innerHTML = '';
        try {
            const querySnapshot = await getDocs(collection(db, "productos"));

            if (querySnapshot.empty) {
                inventoryList.innerHTML = '<tr><td colspan="7">No hay productos.</td></tr>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const product = docSnap.data();
                const id = docSnap.id;
                
                // Usamos imagen por defecto si no tiene una
                const imgUrl = product.imagenUrl || 'https://placehold.co/40x40?text=Sin+Img';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><img src="${imgUrl}" class="thumb-img" alt="prod"></td>
                    <td>${product.codigo_barras || 'S/N'}</td>
                    <td>${product.nombre}</td>
                    <td>${product.proveedor_ref || 'Sin asignar'}</td> 
                    <td>$${product.precio_venta}</td>
                    <td>${product.stock}</td>
                    <td>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn" data-id="${id}">Eliminar</button>
                    </td>
                `;

                // Configurar botón Editar (Pasamos también la URL actual)
                row.querySelector('.edit-btn').addEventListener('click', () => {
                    window.openEditModal(
                        id, product.nombre, product.codigo_barras, 
                        product.precio_compra, product.precio_venta, 
                        product.stock, product.imagenUrl
                    );
                });

                inventoryList.appendChild(row);
            });
        } catch (error) {
            console.error("Error cargando productos:", error);
        }
    };


    // --- 3. AGREGAR PRODUCTO (POST) CON VALIDACIÓN ---
    const handleAddProduct = async (event) => {
        event.preventDefault();
        
        // ... (Tu validación de proveedor se queda igual) ...

        // 1. Obtener el archivo
        const fileInput = document.getElementById('imagenProducto');
        const file = fileInput.files[0];

        // 2. Subir imagen (si existe) y obtener URL
        let imagenUrl = "";
        if (file) {
            // Feedback visual simple
            const btnSubmit = newProductForm.querySelector('button[type="submit"]');
            btnSubmit.textContent = "Subiendo imagen...";
            btnSubmit.disabled = true;
            
            imagenUrl = await uploadImage(file);
            
            btnSubmit.textContent = "Agregar Producto";
            btnSubmit.disabled = false;
        }

        const newProduct = {
            nombre: document.getElementById('nombre').value,
            codigo_barras: document.getElementById('codigo_barras').value,
            precio_compra: parseFloat(document.getElementById('precio_compra').value),
            precio_venta: parseFloat(document.getElementById('precio_venta').value),
            stock: parseInt(document.getElementById('stock').value),
            unidad: document.getElementById('unidad').value,
            proveedor_ref: document.getElementById('proveedor_ref').value, 
            imagenUrl: imagenUrl, // GUARDAMOS LA URL
            fecha_alta: new Date().toISOString().split('T')[0]
        };

        try {
            await addDoc(collection(db, "productos"), newProduct);
            alert('Producto agregado exitosamente.');
            newProductForm.reset();
            fetchProducts();
        } catch (error) {
            console.error("Error agregando:", error);
            alert("Error al guardar en Firebase");
        }
    };

    // --- ELIMINAR (DELETE) ---
    inventoryList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            if(!confirm("¿Borrar producto?")) return;
            const id = e.target.getAttribute('data-id');
            try {
                await deleteDoc(doc(db, "productos", id));
                fetchProducts();
            } catch (error) {
                console.error("Error borrando:", error);
            }
        }
    });

    // --- LOGICA MODAL EDITAR (Mantenemos la existente, solo recuerda que si quieres editar proveedor necesitas agregar el input al modal HTML) ---
    // (Pega aquí la lógica del modal de editar que hicimos en el paso anterior)
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editProductForm');
    let currentEditImgUrl = ""; // Variable para recordar la URL antigua

    window.openEditModal = (id, nombre, codigo, pCompra, pVenta, stock, imgUrl) => {
        document.getElementById('editId').value = id;
        document.getElementById('editNombre').value = nombre;
        document.getElementById('editCodigo').value = codigo || '';
        document.getElementById('editPrecioC').value = pCompra;
        document.getElementById('editPrecioV').value = pVenta;
        document.getElementById('editStock').value = stock;
        
        // Vista previa
        currentEditImgUrl = imgUrl || "";
        document.getElementById('editPreviewImg').src = currentEditImgUrl || 'https://placehold.co/80x80?text=Sin+Img';
        
        editModal.style.display = 'flex';
    };

    // Vista previa al seleccionar nuevo archivo en editar
    document.getElementById('editImagen').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('editPreviewImg').src = URL.createObjectURL(file);
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const file = document.getElementById('editImagen').files[0];
        
        let finalImgUrl = currentEditImgUrl; // Por defecto mantenemos la vieja

        // Si seleccionó un archivo nuevo, lo subimos
        if (file) {
            const btn = editForm.querySelector('button');
            btn.textContent = "Subiendo imagen...";
            btn.disabled = true;
            finalImgUrl = await uploadImage(file);
            btn.textContent = "Guardar Cambios";
            btn.disabled = false;
        }

        const updatedData = {
            nombre: document.getElementById('editNombre').value,
            codigo_barras: document.getElementById('editCodigo').value,
            precio_compra: parseFloat(document.getElementById('editPrecioC').value),
            precio_venta: parseFloat(document.getElementById('editPrecioV').value),
            stock: parseInt(document.getElementById('editStock').value),
            imagenUrl: finalImgUrl // Actualizamos URL
        };

        try {
            await updateDoc(doc(db, "productos", id), updatedData);
            alert("Producto actualizado");
            editModal.style.display = 'none';
            fetchProducts();
        } catch (error) {
            console.error("Error:", error);
        }
    });

    // Inicialización
    newProductForm.addEventListener('submit', handleAddProduct);
    loadSuppliersForSelect(); // Cargar la lista de proveedores al iniciar
    fetchProducts();
    const closeModal = document.querySelector('.close-modal');
    if(closeModal) closeModal.onclick = () => editModal.style.display = 'none';


    // Función para generar código aleatorio (EAN-13 simulado o simple numérico)
    const generarCodigoUnico = () => {
        // Generamos un número basado en el tiempo actual para que sea único
        // Ej: 20250916 + 4 dígitos random
        const random = Math.floor(1000 + Math.random() * 9000);
        return `PROD${Date.now().toString().slice(-8)}${random}`;
    };

    // Evento del botón
    if(btnGenerar) {
        btnGenerar.addEventListener('click', () => {
            const nuevoCodigo = generarCodigoUnico();
            inputCodigo.value = nuevoCodigo;
            
            // Dibujar código de barras
            canvasCodigo.style.display = 'block';
            JsBarcode("#barcodeCanvas", nuevoCodigo, {
                format: "CODE128",
                lineColor: "#000",
                width: 2,
                height: 40,
                displayValue: true
            });
        });
    }

    // Opcional: Si el usuario escribe manualmente, también dibujar
    inputCodigo.addEventListener('input', () => {
        if(inputCodigo.value.length > 3) {
            canvasCodigo.style.display = 'block';
            try {
                JsBarcode("#barcodeCanvas", inputCodigo.value, { format: "CODE128" });
            } catch(e) { /* Ignorar errores si el texto no es válido */ }
        } else {
            canvasCodigo.style.display = 'none';
        }
    });
});
