import { db } from './firebase-init.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc, 
    updateDoc // <--- 1. IMPORTANTE: Agregamos esto
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Referencias principales
    const supplierList = document.getElementById('supplierList');
    const newSupplierForm = document.getElementById('newSupplierForm');

    // Referencias del Modal de Edición
    const editModal = document.getElementById('editSupplierModal');
    const editForm = document.getElementById('editSupplierForm');
    // Botón de cerrar (la X)
    const closeEditBtn = document.getElementById('closeEditSupplier');

    // --- LEER PROVEEDORES (GET) ---
    const fetchSuppliers = async () => {
        supplierList.innerHTML = ''; // Limpiar tabla
        try {
            const querySnapshot = await getDocs(collection(db, "proveedores"));

            if (querySnapshot.empty) {
                supplierList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay proveedores registrados.</td></tr>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const supplier = docSnap.data();
                const id = docSnap.id;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${id.substring(0, 8)}...</td>
                    <td>${supplier.nombre}</td>
                    <td>${supplier.contacto}</td>
                    <td>
                        <button class="edit-btn">Editar</button>
                        <button class="delete-btn" data-id="${id}">Eliminar</button>
                    </td>
                `;

                // Asignamos el evento click al botón editar de esta fila
                const editBtn = row.querySelector('.edit-btn');
                editBtn.addEventListener('click', () => {
                    openEditModal(id, supplier.nombre, supplier.contacto);
                });

                supplierList.appendChild(row);
            });

        } catch (error) {
            console.error("Error al cargar proveedores:", error);
            supplierList.innerHTML = '<tr><td colspan="4" style="color:red;">Error de conexión.</td></tr>';
        }
    };

    // --- AGREGAR PROVEEDOR (POST) ---
    const handleAddSupplier = async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const contacto = document.getElementById('contacto').value;

        const newSupplier = {
            nombre: nombre,
            contacto: contacto,
            fecha_registro: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "proveedores"), newSupplier);
            alert('Proveedor agregado exitosamente.');
            newSupplierForm.reset();
            fetchSuppliers();
        } catch (error) {
            console.error("Error al agregar proveedor:", error);
            alert("Hubo un error al guardar en Firebase.");
        }
    };

    // --- FUNCIONES DEL MODAL DE EDICIÓN ---

    // 1. Abrir Modal y llenar datos
    const openEditModal = (id, nombre, contacto) => {
        document.getElementById('editSupplierId').value = id;
        document.getElementById('editSupplierNombre').value = nombre;
        document.getElementById('editSupplierContacto').value = contacto;
        
        editModal.style.display = 'flex'; // Mostrar modal
    };

    // 2. Guardar Cambios (UPDATE)
    if(editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('editSupplierId').value;
            const updatedData = {
                nombre: document.getElementById('editSupplierNombre').value,
                contacto: document.getElementById('editSupplierContacto').value
            };

            try {
                const docRef = doc(db, "proveedores", id);
                await updateDoc(docRef, updatedData); // Actualizar en Firebase
                
                alert("Proveedor actualizado correctamente.");
                editModal.style.display = 'none'; // Cerrar modal
                fetchSuppliers(); // Recargar tabla
            } catch (error) {
                console.error("Error al actualizar:", error);
                alert("Error al actualizar el proveedor.");
            }
        });
    }

    // 3. Cerrar Modal (Click en la X o fuera del modal)
    if(closeEditBtn) {
        closeEditBtn.onclick = () => editModal.style.display = 'none';
    }
    
    window.onclick = (e) => {
        if (e.target == editModal) {
            editModal.style.display = 'none';
        }
    };

    // --- ELIMINAR PROVEEDOR (DELETE) ---
    supplierList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            if (confirm('¿Estás seguro de eliminar este proveedor?')) {
                try {
                    await deleteDoc(doc(db, "proveedores", id));
                    alert('Proveedor eliminado.');
                    fetchSuppliers();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("No se pudo eliminar el proveedor.");
                }
            }
        }
    });

    // Eventos iniciales
    newSupplierForm.addEventListener('submit', handleAddSupplier);
    fetchSuppliers();
});
