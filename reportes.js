import { db } from './firebase-init.js';
import { collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 


document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM
    const generateBtn = document.getElementById('generateReportBtn');
    const reportTypeSelect = document.getElementById('reportType');
    
    // Elementos de KPIs
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalSalesEl = document.getElementById('totalSales');
    const averageTicketEl = document.getElementById('averageTicket');
    
    // Elementos de Gráfica y Tabla
    const chartCanvas = document.getElementById('salesChart');
    const topProductsTableBody = document.getElementById('topProductsTableBody');
    
    let myChart = null; // Variable global para controlar la instancia del gráfico

    // --- FUNCIÓN PRINCIPAL ---
    const generateReport = async () => {
        // Feedback visual de carga
        generateBtn.textContent = "Generando...";
        generateBtn.disabled = true;
        resetUI();

        try {
            const tipo = reportTypeSelect.value;

            if (tipo === 'top-deudores') {
                const clientsSnapshot = await getDocs(collection(db, "clientes"));
                const clients = [];
                clientsSnapshot.forEach(doc => clients.push(doc.data()));
                renderTopDebtors(clients);
                toggleViews('chart');
                generateBtn.textContent = "Generar";
                generateBtn.disabled = false;
                return; // Terminamos aquí para este caso
            }
            // 1. Obtener todas las ventas ordenadas por fecha
            // Nota: En una app real con miles de ventas, aquí deberías filtrar por rangos de fecha (where)
            const salesQuery = query(collection(db, "ventas"), orderBy("fecha", "asc"));
            const querySnapshot = await getDocs(salesQuery);
            
            const sales = [];
            querySnapshot.forEach(doc => {
                sales.push(doc.data());
            });

            if (sales.length === 0) {
                alert("No hay ventas registradas para generar reportes.");
                resetUI();
                return;
            }

            // 2. Calcular KPIs Generales (Tarjetas de arriba)
            calculateKPIs(sales);

            // 3. Generar Gráfica/Tabla según selección
            const type = reportTypeSelect.value;
            
            switch (type) {
                case 'ventas-mensuales':
                    renderMonthlySales(sales);
                    toggleViews('chart');
                    break;
                case 'ventas-por-dia':
                    renderDailySales(sales);
                    toggleViews('chart');
                    break;
                case 'productos-mas-vendidos':
                    renderTopProducts(sales);
                    toggleViews('table');
                    break;
                // --- NUEVOS REPORTES ---
                case 'metodos-pago':
                    renderPaymentMethods(sales);
                    toggleViews('chart');
                    break;
                case 'horas-pico':
                    renderBusyHours(sales);
                    toggleViews('chart');
                    break;
            }

        } catch (error) {
            console.error("Error generando reporte:", error);
            alert("Error al cargar los datos de reportes.");
        } finally {
            generateBtn.textContent = "Generar";
            generateBtn.disabled = false;
        }
    };

    // --- CÁLCULO DE KPIs ---
    const calculateKPIs = (sales) => {
        let totalRevenue = 0;
        
        sales.forEach(sale => {
            totalRevenue += sale.total;
        });

        const totalTransactions = sales.length;
        const averageTicket = totalTransactions > 0 ? (totalRevenue / totalTransactions) : 0;

        // Renderizar en el DOM
        totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;
        totalSalesEl.textContent = totalTransactions;
        averageTicketEl.textContent = `$${averageTicket.toFixed(2)}`;
    };

    // --- GRÁFICA: VENTAS MENSUALES ---
    const renderMonthlySales = (sales) => {
        const groupedData = {};

        sales.forEach(sale => {
            // Convertir Timestamp de Firebase a fecha JS
            const date = sale.fecha.toDate(); 
            // Clave: "Septiembre 2025" o "2025-09"
            const monthKey = date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            
            if (!groupedData[monthKey]) groupedData[monthKey] = 0;
            groupedData[monthKey] += sale.total;
        });

        const labels = Object.keys(groupedData);
        const data = Object.values(groupedData);

        createChart('bar', labels, data, 'Ventas por Mes ($)');
    };

    // --- GRÁFICA: VENTAS POR DÍA ---
    const renderDailySales = (sales) => {
        const groupedData = {};

        sales.forEach(sale => {
            const date = sale.fecha.toDate();
            const dayKey = date.toLocaleDateString('es-ES'); // "16/9/2025"
            
            if (!groupedData[dayKey]) groupedData[dayKey] = 0;
            groupedData[dayKey] += sale.total;
        });

        const labels = Object.keys(groupedData);
        const data = Object.values(groupedData);

        createChart('line', labels, data, 'Ventas por Día ($)');
    };

    // --- TABLA: PRODUCTOS MÁS VENDIDOS ---
    const renderTopProducts = (sales) => {
        const productCount = {};

        // Recorrer ventas y luego los items dentro de cada venta
        sales.forEach(sale => {
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const name = item.nombre || 'Producto desconocido';
                    const qty = item.cantidad || 0;

                    if (!productCount[name]) productCount[name] = 0;
                    productCount[name] += qty;
                });
            }
        });

        // Convertir objeto a array y ordenar
        const sortedProducts = Object.entries(productCount)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity) // Orden descendente
            .slice(0, 10); // Top 10

        // Renderizar Tabla
        topProductsTableBody.innerHTML = '';
        sortedProducts.forEach(prod => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${prod.name}</td>
                <td>${prod.quantity.toFixed(2)}</td> `;
            topProductsTableBody.appendChild(row);
        });
    };

    // --- UTILIDAD: CREAR CHART.JS ---
    const createChart = (type, labels, data, labelTitle) => {
        // Destruir gráfico anterior si existe para evitar superposiciones
        if (myChart) {
            myChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        myChart = new Chart(ctx, {
            type: type, // 'bar' o 'line'
            data: {
                labels: labels,
                datasets: [{
                    label: labelTitle,
                    data: data,
                    backgroundColor: 'rgba(191, 157, 191, 0.6)', // Color primario (morado claro)
                    borderColor: 'rgba(191, 157, 191, 1)',
                    borderWidth: 1,
                    tension: 0.3 // Suavizado para líneas
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return '$' + value; }
                        }
                    }
                }
            }
        });
    };

    const renderPaymentMethods = (sales) => {
        let efectivo = 0;
        let credito = 0;

        sales.forEach(sale => {
            // Normalizamos texto a minúsculas por si guardaste "Efectivo" o "efectivo"
            const tipo = (sale.tipo_pago || 'efectivo').toLowerCase();
            if (tipo.includes('crédito') || tipo.includes('credito')) {
                credito++;
            } else {
                efectivo++;
            }
        });

        const ctx = chartCanvas.getContext('2d');
        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: 'doughnut', // Gráfica de Dona
            data: {
                labels: ['Efectivo', 'Crédito'],
                datasets: [{
                    data: [efectivo, credito],
                    backgroundColor: [
                        'rgba(191, 157, 191, 0.7)', // Morado (Tu color primario)
                        'rgba(244, 245, 220, 1)'    // Crema (Tu color secundario, ajustado para que se vea)
                        // Si el crema es muy claro, usa: 'rgba(54, 162, 235, 0.7)' (Azul)
                    ],
                    borderColor: ['#BF9DBF', '#ccc'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    title: { display: true, text: 'Distribución de Ventas por Tipo de Pago' }
                }
            }
        });
    };

    // --- NUEVO: GRÁFICA DE BARRAS (HORAS PICO) ---
    const renderBusyHours = (sales) => {
        // Inicializar contador para las 24 horas del día
        const hoursCount = new Array(24).fill(0);

        sales.forEach(sale => {
            const date = sale.fecha.toDate();
            const hour = date.getHours(); // Retorna 0 a 23
            hoursCount[hour]++;
        });

        // Generar etiquetas "08:00", "09:00"...
        const labels = hoursCount.map((_, i) => `${i}:00`);

        createChart('bar', labels, hoursCount, 'Transacciones por Hora');
    };

    // --- NUEVO: BARRAS HORIZONTALES (TOP DEUDORES) ---
    const renderTopDebtors = (clients) => {
        // Filtrar clientes con deuda > 0 y ordenar descendente
        const debtors = clients
            .filter(c => c.deuda > 0)
            .sort((a, b) => b.deuda - a.deuda)
            .slice(0, 10); // Top 10

        const labels = debtors.map(c => c.nombre);
        const data = debtors.map(c => c.deuda);

        const ctx = chartCanvas.getContext('2d');
        if (myChart) myChart.destroy();

        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Deuda Total ($)',
                    data: data,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)', // Rojo para alertar deuda
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // ESTO HACE QUE LAS BARRAS SEAN HORIZONTALES
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: { callback: (val) => '$' + val }
                    }
                },
                plugins: {
                    title: { display: true, text: 'Clientes con Mayor Deuda' }
                }
            }
        });
        
        // Actualizamos los KPIs manualmente para este reporte específico
        const totalDeuda = data.reduce((a, b) => a + b, 0);
        totalRevenueEl.textContent = "N/A"; 
        totalSalesEl.textContent = debtors.length; // Cantidad de deudores mostrados
        averageTicketEl.textContent = `$${totalDeuda.toFixed(2)}`; // Total deuda mostrada
        // Nota: Cambiamos las etiquetas visualmente solo para este momento
        document.querySelector('.card:nth-child(3) h4').textContent = "Deuda Total (Top 10)";
    };
    // --- UTILIDAD: MOSTRAR/OCULTAR SECCIONES ---
    const toggleViews = (view) => {
        const chartContainer = document.querySelector('.chart-container');
        const tableContainer = document.querySelector('.top-products-container');

        if (view === 'chart') {
            chartContainer.style.display = 'block';
            tableContainer.style.display = 'none';
        } else {
            chartContainer.style.display = 'none';
            tableContainer.style.display = 'block';
        }
    };

    const resetUI = () => {
        totalRevenueEl.textContent = "$0.00";
        totalSalesEl.textContent = "0";
        averageTicketEl.textContent = "$0.00";
        if(myChart) myChart.destroy();
        topProductsTableBody.innerHTML = '';
    };

    // Event Listeners
    generateBtn.addEventListener('click', generateReport);
    
    // Cargar reporte inicial (por defecto Ventas Mensuales)
    generateReport();
});
