import { db } from './firebase-init.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc, 
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const clientList = document.getElementById('clientList');
    const newClientForm = document.getElementById('newClientForm');
    const editModal = document.getElementById('editClientModal');
    const payModal = document.getElementById('payModal');

    // --- LEER CLIENTES (GET) ---
    const fetchClients = async () => {
        clientList.innerHTML = ''; // Limpiar tabla
        try {
            const querySnapshot = await getDocs(collection(db, "clientes"));

            if (querySnapshot.empty) {
                clientList.innerHTML = '<tr><td colspan="5" style="text-align:center;">No hay clientes registrados.</td></tr>';
                return;
            }

            querySnapshot.forEach((docSnap) => {
                const client = docSnap.data();
                const id = docSnap.id; // ID generado por Firebase o importado

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${id.substring(0, 8)}...</td> <td>${client.nombre}</td>
                    <td>${client.telefono}</td>
                    <td>$${parseFloat(client.deuda || 0).toFixed(2)}</td>
                    <td>
                        <button class="pay-btn" style="background-color:#28a745">Abonar</button>
                        <button class="edit-btn" data-id="${id}">Editar</button>
                        <button class="delete-btn" data-id="${id}">Eliminar</button>
                    </td>
                `;
                row.querySelector('.pay-btn').addEventListener('click', () => openPayModal(id, client.nombre, client.deuda));
                row.querySelector('.edit-btn').addEventListener('click', () => openEditModal(id, client.nombre, client.telefono));
                clientList.appendChild(row);
            });

        } catch (error) {
            console.error("Error al obtener clientes:", error);
            clientList.innerHTML = '<tr><td colspan="5" style="color:red;">Error de conexión.</td></tr>';
        }
    };

    const openPayModal = (id, nombre, deuda) => {
        document.getElementById('payClientId').value = id;
        document.getElementById('payClientName').textContent = nombre;
        document.getElementById('payCurrentDebt').textContent = parseFloat(deuda || 0).toFixed(2);
        document.getElementById('payAmount').value = ''; // limpiar
        payModal.style.display = 'flex';
    };

    document.getElementById('payForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('payClientId').value;
        const amount = parseFloat(document.getElementById('payAmount').value);

        try {
            // Restar la deuda usando increment negativo
            await updateDoc(doc(db, "clientes", id), {
                deuda: increment(-amount)
            });
            
            // Opcional: Podrías crear una colección "pagos" para historial
            
            alert("Abono registrado con éxito.");
            payModal.style.display = 'none';
            fetchClients();
        } catch (error) {
            console.error("Error al abonar:", error);
            alert("Error al procesar el pago");
        }
    });

    const openEditModal = (id, nombre, telefono) => {
        document.getElementById('editClientId').value = id;
        document.getElementById('editClientNombre').value = nombre;
        document.getElementById('editClientTelefono').value = telefono;
        editModal.style.display = 'flex';
    };

    document.getElementById('editClientForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editClientId').value;
        await updateDoc(doc(db, "clientes", id), {
            nombre: document.getElementById('editClientNombre').value,
            telefono: document.getElementById('editClientTelefono').value
        });
        alert("Cliente actualizado");
        editModal.style.display = 'none';
        fetchClients();
    });

    // Cerrar modales (Click en X)
    document.querySelectorAll('.close-modal').forEach(el => {
        el.onclick = () => {
            editModal.style.display = 'none';
            payModal.style.display = 'none';
        }
    });
    // --- AGREGAR CLIENTE (POST) ---
    const handleAddClient = async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nombre').value;
        const telefono = document.getElementById('telefono').value;
        const deudaInput = document.getElementById('deuda').value;

        const newClient = {
            nombre: nombre,
            telefono: telefono,
            deuda: deudaInput ? parseFloat(deudaInput) : 0,
            fecha_registro: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, "clientes"), newClient);
            alert('Cliente agregado exitosamente.');
            newClientForm.reset();
            fetchClients(); // Recargar la lista
        } catch (error) {
            console.error("Error al agregar cliente:", error);
            alert("Hubo un error al guardar en Firebase.");
        }
    };

    // --- ELIMINAR CLIENTE (DELETE) ---
    // Usamos delegación de eventos en la tabla
    clientList.addEventListener('click', async (e) => {
        // Detectar botón eliminar
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
                try {
                    await deleteDoc(doc(db, "clientes", id));
                    alert('Cliente eliminado.');
                    fetchClients();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("Error al eliminar el cliente.");
                }
            }
        }

    });

    // Eventos iniciales
    newClientForm.addEventListener('submit', handleAddClient);
    fetchClients();
});
