// Variables globales para el estado de la aplicación
let currentUser = null;
let currentSection = 'registro';

// Sistema de autenticación
let registeredUsers = {};  // {username: {password, attempts: 0, locked: false}}

// Datos en memoria
let owners = [];
let pets = [];
let appointments = [];
let cart = [];
let catalog = [];

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadDataFromStorage();
    initializeCatalog();
});

// Inicializar la aplicación
function initializeApp() {
    // Sin localStorage - siempre mostrar login
    showLogin();
}

// Configurar event listeners
function setupEventListeners() {
    // Login y Registro
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('switchToRegisterBtn').addEventListener('click', switchToRegister);
    document.getElementById('switchToLoginBtn').addEventListener('click', switchToLogin);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Formularios
    document.getElementById('ownerForm').addEventListener('submit', handleOwnerSubmit);
    document.getElementById('petForm').addEventListener('submit', handlePetSubmit);
    document.getElementById('appointmentForm').addEventListener('submit', handleAppointmentSubmit);
    
    // Filtros del catálogo
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', handleCatalogFilter);
    });
    
    // Checkout
    document.getElementById('checkoutBtn').addEventListener('click', handleCheckout);
    
    // Validaciones en tiempo real
    setupRealTimeValidation();
}

// Configurar validaciones en tiempo real
function setupRealTimeValidation() {
    // Validación del email de usuario en login
    document.getElementById('username').addEventListener('input', function() {
        if (this.value.trim()) {
            validateUserEmail(this.value.trim(), 'usernameError');
        }
    });

    // Validación del email de usuario en registro
    document.getElementById('registerUsername').addEventListener('input', function() {
        if (this.value.trim()) {
            validateUserEmail(this.value.trim(), 'registerUsernameError');
        }
    });

    // Validación del nombre del dueño
    document.getElementById('ownerName').addEventListener('input', function() {
        validateOwnerName(this.value, 'ownerNameError');
    });

    // Validación del teléfono
    document.getElementById('ownerPhone').addEventListener('input', function() {
        validatePhone(this.value, 'ownerPhoneError');
    });

    // Validación del email
    document.getElementById('ownerEmail').addEventListener('input', function() {
        validateEmail(this.value, 'ownerEmailError');
    });

    // Validación del nombre de la mascota
    document.getElementById('petName').addEventListener('input', function() {
        validatePetName(this.value, 'petNameError');
    });

    // Validación de la fecha de cita
    document.getElementById('appointmentDate').addEventListener('input', function() {
        validateAppointmentDate(this.value, 'appointmentDateError');
    });

    // Validación de la hora de cita
    document.getElementById('appointmentTime').addEventListener('input', function() {
        validateAppointmentTime(this.value, 'appointmentTimeError');
    });
}

// === FUNCIONES DE AUTENTICACIÓN ===

// Cambiar a vista de registro
function switchToRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    clearAllErrors();
}

// Cambiar a vista de login
function switchToLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    clearAllErrors();
}

// Validar formato de email
function validateUserEmail(email, errorId) {
    if (!email) {
        showError(errorId, 'El correo electrónico es obligatorio');
        return false;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError(errorId, 'Formato de correo electrónico inválido');
        return false;
    }

    clearError(errorId);
    return true;
}

// Manejar registro de nueva cuenta
function handleRegister(e) {
    e.preventDefault();

    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Limpiar errores previos
    clearError('registerUsernameError');
    clearError('registerPasswordError');
    clearError('registerPasswordConfirmError');

    let hasErrors = false;

    // Validaciones
    if (!validateUserEmail(username, 'registerUsernameError')) {
        hasErrors = true;
    }

    if (registeredUsers[username]) {
        showError('registerUsernameError', 'Este correo ya está registrado');
        hasErrors = true;
    }

    // Validar contraseña con regex
    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,}$/;
    if (!password) {
        showError('registerPasswordError', 'La contraseña es obligatoria');
        hasErrors = true;
    } else if (!passwordRegex.test(password)) {
        showError('registerPasswordError', 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y carácter especial');
        hasErrors = true;
    }

    if (password !== passwordConfirm) {
        showError('registerPasswordConfirmError', 'Las contraseñas no coinciden');
        hasErrors = true;
    }

    if (hasErrors) return;

    // Crear nueva cuenta
    registeredUsers[username] = {
        password: password,
        attempts: 0,
        locked: false
    };

    showNotification(`Cuenta "${username}" creada exitosamente. Iniciando sesión...`, 'success');

    // Limpiar formulario y cambiar a login
    document.getElementById('registerFormElement').reset();

    // Esperar un momento y hacer login automático
    setTimeout(() => {
        document.getElementById('username').value = username;
        document.getElementById('password').value = password;
        handleLoginInternal(username, password);
        switchToLogin();
    }, 1000);
}

// Manejar login
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Limpiar errores previos
    clearError('usernameError');
    clearError('passwordError');

    let hasErrors = false;

    // Validaciones
    if (!validateUserEmail(username, 'usernameError')) {
        hasErrors = true;
    }

    if (!password) {
        showError('passwordError', 'La contraseña es obligatoria');
        hasErrors = true;
    }

    if (hasErrors) return;

    handleLoginInternal(username, password);
}

// Función interna para procesar login
function handleLoginInternal(username, password) {
    // Validar que la cuenta existe
    if (!registeredUsers[username]) {
        showError('usernameError', 'Este correo no está registrado. Por favor cree una cuenta.');
        return;
    }

    const user = registeredUsers[username];

    // Validar que la cuenta no esté bloqueada
    if (user.locked) {
        showError('passwordError', '⚠️ Cuenta bloqueada por exceso de intentos fallidos');
        return;
    }

    // Validar contraseña
    if (user.password === password) {
        // Login exitoso
        currentUser = username;
        user.attempts = 0;  // Reiniciar intentos fallidos

        // Limpiar formulario
        document.getElementById('loginFormElement').reset();

        showApp();
        showNotification(`¡Bienvenido ${username}!`, 'success');
    } else {
        // Contraseña incorrecta
        user.attempts += 1;

        if (user.attempts >= 3) {
            user.locked = true;
            showError('passwordError', '❌ Cuenta bloqueada. Demasiados intentos fallidos (3 máximo)');
        } else {
            const intentosRestantes = 3 - user.attempts;
            showError('passwordError', `Contraseña incorrecta. Intentos restantes: ${intentosRestantes}`);
        }
    }
}

function handleLogout() {
    currentUser = null;
    // Simular logout sin guardar en localStorage
    showLogin();
    showNotification('Sesión cerrada correctamente', 'success');
}

function showLogin() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('appContainer').classList.add('hidden');
    
    // Mostrar formulario de login y ocultar registro
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    
    // Limpiar formularios
    document.getElementById('loginFormElement').reset();
    document.getElementById('registerFormElement').reset();
    clearAllErrors();
}

function showApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('appContainer').classList.remove('hidden');
    
    // Simular datos - sin cargar de localStorage
    renderOwners();
    renderPets();
    renderAppointments();
    renderCatalog();
    renderCart();
    updateOwnerSelect();
    updatePetSelects();
}

// === FUNCIONES DE NAVEGACIÓN ===

function handleNavigation(e) {
    e.preventDefault();
    const section = e.target.dataset.section;
    if (section) {
        showSection(section);
    }
}

function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.main-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Mostrar la sección seleccionada
    document.getElementById(sectionName + 'Section').classList.remove('hidden');
    
    // Actualizar navegación activa
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    currentSection = sectionName;
    
    // Actualizar datos específicos de la sección
    if (sectionName === 'agenda') {
        updatePetSelects();
    }
}

// === FUNCIONES DE VALIDACIÓN ===

function validateOwnerName(name, errorId) {
    if (!name || name.length < 2) {
        showError(errorId, 'El nombre debe tener al menos 2 caracteres');
        return false;
    }
    
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(name)) {
        showError(errorId, 'El nombre solo puede contener letras y espacios');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function validatePhone(phone, errorId) {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    if (!cleanPhone) {
        showError(errorId, 'El teléfono es obligatorio');
        return false;
    }
    
    if (!/^\d{8,15}$/.test(cleanPhone)) {
        showError(errorId, 'El teléfono debe tener entre 8 y 15 dígitos');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function validateEmail(email, errorId) {
    if (!email) {
        showError(errorId, 'El correo es obligatorio');
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError(errorId, 'Formato de correo inválido');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function validatePetName(name, errorId) {
    if (!name || name.length < 2) {
        showError(errorId, 'El nombre debe tener al menos 2 caracteres');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function validateAppointmentDate(date, errorId) {
    if (!date) {
        showError(errorId, 'La fecha es obligatoria');
        return false;
    }
    
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        showError(errorId, 'No se pueden agendar citas en fechas pasadas');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function validateAppointmentTime(time, errorId) {
    if (!time) {
        showError(errorId, 'La hora es obligatoria');
        return false;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    if (hours < 8 || hours > 20) {
        showError(errorId, 'El horario de atención es de 08:00 a 20:00');
        return false;
    }
    
    clearError(errorId);
    return true;
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Agregar clase de error al input
        const inputElement = errorElement.previousElementSibling;
        if (inputElement) {
            inputElement.classList.add('input-error');
        }
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
        
        // Remover clase de error del input
        const inputElement = errorElement.previousElementSibling;
        if (inputElement) {
            inputElement.classList.remove('input-error');
        }
    }
}

function clearAllErrors() {
    document.querySelectorAll('.error-message').forEach(element => {
        element.textContent = '';
        element.style.display = 'none';
    });
    
    document.querySelectorAll('.input-error').forEach(element => {
        element.classList.remove('input-error');
    });
}

// === FUNCIONES DE GESTIÓN DE DUEÑOS ===

function handleOwnerSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const ownerData = {
        name: formData.get('ownerName'),
        phone: formData.get('ownerPhone'),
        email: formData.get('ownerEmail')
    };
    
    if (validateOwnerData(ownerData)) {
        saveOwner(ownerData);
        e.target.reset();
        clearAllErrors();
        showNotification('Dueño registrado correctamente', 'success');
    }
}

function validateOwnerData(data) {
    let isValid = true;
    
    if (!validateOwnerName(data.name, 'ownerNameError')) isValid = false;
    if (!validatePhone(data.phone, 'ownerPhoneError')) isValid = false;
    if (!validateEmail(data.email, 'ownerEmailError')) isValid = false;
    
    return isValid;
}

function saveOwner(ownerData) {
    const owner = {
        id: Date.now(),
        ...ownerData,
        createdAt: new Date().toISOString()
    };
    
    owners.push(owner);
    // Simular guardado sin localStorage
    renderOwners();
    updateOwnerSelect();
}

function renderOwners() {
    const container = document.getElementById('ownersList');
    
    if (owners.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay dueños registrados</p>';
        return;
    }
    
    container.innerHTML = owners.map(owner => `
        <div class="record-item">
            <h4>${owner.name}</h4>
            <p><strong>Teléfono:</strong> ${owner.phone}</p>
            <p><strong>Correo:</strong> ${owner.email}</p>
            <p><strong>Registrado:</strong> ${formatDate(owner.createdAt)}</p>
        </div>
    `).join('');
}

function updateOwnerSelect() {
    const select = document.getElementById('petOwner');
    select.innerHTML = '<option value="">Seleccionar dueño</option>';
    
    owners.forEach(owner => {
        const option = document.createElement('option');
        option.value = owner.id;
        option.textContent = owner.name;
        select.appendChild(option);
    });
}

// === FUNCIONES DE GESTIÓN DE MASCOTAS ===

function handlePetSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const petData = {
        ownerId: formData.get('petOwner'),
        name: formData.get('petName'),
        species: formData.get('petSpecies'),
        breed: formData.get('petBreed')
    };
    
    if (validatePetData(petData)) {
        savePet(petData);
        e.target.reset();
        clearAllErrors();
        showNotification('Mascota registrada correctamente', 'success');
    }
}

function validatePetData(data) {
    let isValid = true;
    
    if (!data.ownerId) {
        showError('petOwnerError', 'Debe seleccionar un dueño');
        isValid = false;
    } else {
        clearError('petOwnerError');
    }
    
    if (!validatePetName(data.name, 'petNameError')) isValid = false;
    
    if (!data.species) {
        showError('petSpeciesError', 'Debe seleccionar una especie');
        isValid = false;
    } else {
        clearError('petSpeciesError');
    }
    
    if (!data.breed) {
        showError('petBreedError', 'La raza es obligatoria');
        isValid = false;
    } else if (data.species === 'otro' && data.breed.toLowerCase() !== 'n/a') {
        // Permitir N/A para especies "otro"
        clearError('petBreedError');
    } else {
        clearError('petBreedError');
    }
    
    return isValid;
}

function savePet(petData) {
    const owner = owners.find(o => o.id == petData.ownerId);
    
    const pet = {
        id: Date.now(),
        ...petData,
        ownerName: owner ? owner.name : 'Desconocido',
        createdAt: new Date().toISOString()
    };
    
    pets.push(pet);
    // Simular guardado sin localStorage
    renderPets();
    updatePetSelects();
}

function renderPets() {
    const container = document.getElementById('petsList');
    
    if (pets.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay mascotas registradas</p>';
        return;
    }
    
    container.innerHTML = pets.map(pet => `
        <div class="record-item">
            <h4>${pet.name}</h4>
            <p><strong>Dueño:</strong> ${pet.ownerName}</p>
            <p><strong>Especie:</strong> ${pet.species}</p>
            <p><strong>Raza:</strong> ${pet.breed}</p>
            <p><strong>Registrado:</strong> ${formatDate(pet.createdAt)}</p>
        </div>
    `).join('');
}

function updatePetSelects() {
    const select = document.getElementById('appointmentPet');
    select.innerHTML = '<option value="">Seleccionar mascota</option>';
    
    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = `${pet.name} (${pet.ownerName})`;
        select.appendChild(option);
    });
}

// === FUNCIONES DE GESTIÓN DE CITAS ===

function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appointmentData = {
        date: formData.get('appointmentDate'),
        time: formData.get('appointmentTime'),
        petId: formData.get('appointmentPet'),
        service: formData.get('appointmentService')
    };
    
    if (validateAppointmentData(appointmentData)) {
        saveAppointment(appointmentData);
        e.target.reset();
        clearAllErrors();
        showNotification('Cita agendada correctamente', 'success');
    }
}

function validateAppointmentData(data) {
    let isValid = true;
    
    if (!validateAppointmentDate(data.date, 'appointmentDateError')) isValid = false;
    if (!validateAppointmentTime(data.time, 'appointmentTimeError')) isValid = false;
    
    if (!data.petId) {
        showError('appointmentPetError', 'Debe seleccionar una mascota');
        isValid = false;
    } else {
        clearError('appointmentPetError');
    }
    
    if (!data.service) {
        showError('appointmentServiceError', 'Debe seleccionar un servicio');
        isValid = false;
    } else {
        clearError('appointmentServiceError');
    }
    
    // Verificar que hay mascotas registradas
    if (pets.length === 0) {
        showError('appointmentPetError', 'Debe registrar al menos una mascota antes de agendar');
        isValid = false;
    }
    
    return isValid;
}

function saveAppointment(appointmentData) {
    const pet = pets.find(p => p.id == appointmentData.petId);
    
    const appointment = {
        id: Date.now(),
        ...appointmentData,
        petName: pet ? pet.name : 'Desconocida',
        ownerName: pet ? pet.ownerName : 'Desconocido',
        createdAt: new Date().toISOString()
    };
    
    appointments.push(appointment);
    // Simular guardado sin localStorage
    renderAppointments();
}

function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    
    if (appointments.length === 0) {
        container.innerHTML = '<p class="text-muted">No hay citas programadas</p>';
        return;
    }
    
    // Ordenar citas por fecha y hora
    const sortedAppointments = appointments.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA - dateB;
    });
    
    container.innerHTML = sortedAppointments.map(appointment => `
        <div class="appointment-card">
            <h4>${appointment.service}</h4>
            <div class="appointment-info">
                <div><strong>Mascota:</strong> ${appointment.petName}</div>
                <div><strong>Dueño:</strong> ${appointment.ownerName}</div>
                <div><strong>Fecha:</strong> ${formatDate(appointment.date)}</div>
                <div><strong>Hora:</strong> ${appointment.time}</div>
            </div>
        </div>
    `).join('');
}

// === FUNCIONES DE CATÁLOGO Y CARRITO ===

function initializeCatalog() {
    // Inicializar catálogo en memoria (sin localStorage)
    if (catalog.length === 0) {
        const defaultCatalog = [
            {
                id: 1,
                name: 'Baño Completo',
                price: 25000,
                type: 'servicio',
                image: '🛁'
            },
            {
                id: 2,
                name: 'Corte de Pelo',
                price: 20000,
                type: 'servicio',
                image: '✂️'
            },
            {
                id: 3,
                name: 'Spa Completo',
                price: 45000,
                type: 'servicio',
                image: '💆'
            },
            {
                id: 4,
                name: 'Limpieza Dental',
                price: 30000,
                type: 'servicio',
                image: '🦷'
            },
            {
                id: 5,
                name: 'Corte de Uñas',
                price: 10000,
                type: 'servicio',
                image: '💅'
            },
            {
                id: 6,
                name: 'Shampoo Premium',
                price: 15000,
                type: 'producto',
                image: '🧴'
            },
            {
                id: 7,
                name: 'Collar Antipulgas',
                price: 12000,
                type: 'producto',
                image: '🔗'
            },
            {
                id: 8,
                name: 'Juguete para Mascotas',
                price: 8000,
                type: 'producto',
                image: '🎾'
            },
            {
                id: 9,
                name: 'Cepillo de Dientes',
                price: 5000,
                type: 'producto',
                image: '🪥'
            }
        ];
        
        catalog = defaultCatalog;
    }
}

function handleCatalogFilter(e) {
    const filter = e.target.dataset.filter;
    
    // Actualizar botones activos
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    e.target.classList.add('active');
    
    renderCatalog(filter);
}

function renderCatalog(filter = 'all') {
    const container = document.getElementById('catalogGrid');
    
    let filteredCatalog = catalog;
    if (filter !== 'all') {
        filteredCatalog = catalog.filter(item => item.type === filter);
    }
    
    container.innerHTML = filteredCatalog.map(item => `
        <div class="catalog-item" data-type="${item.type}">
            <div class="catalog-item img">${item.image}</div>
            <h4>${item.name}</h4>
            <span class="type-badge type-${item.type}">${item.type}</span>
            <div class="price">Bs${item.price.toLocaleString()}</div>
            <button class="btn btn-primary" onclick="addToCart(${item.id})">
                Agregar al Carrito
            </button>
        </div>
    `).join('');
}

function addToCart(itemId) {
    const item = catalog.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = cart.find(c => c.id === itemId);
    
    if (existingItem) {
        if (existingItem.quantity < 10) {
            existingItem.quantity += 1;
        } else {
            showNotification('Cantidad máxima alcanzada (10)', 'warning');
            return;
        }
    } else {
        cart.push({
            ...item,
            quantity: 1
        });
    }
    
    // Simular guardado sin localStorage
    renderCart();
    showNotification(`${item.name} agregado al carrito`, 'success');
}

function renderCart() {
    const container = document.getElementById('cartItems');
    const totalElement = document.getElementById('cartTotal');
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="cart-empty">El carrito está vacío</div>';
        totalElement.textContent = '0';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h5>${item.name}</h5>
                <div class="price">Bs${item.price.toLocaleString()}</div>
            </div>
            <div class="cart-item-controls">
                <input type="number"
                       class="qty-input"
                       value="${item.quantity}"
                       min="1"
                       max="10"
                       onchange="updateQuantity(${item.id}, this.value)">
                <button class="btn btn-danger btn-small" onclick="removeFromCart(${item.id})">
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
    
    calculateTotals();
}

function updateQuantity(itemId, newQuantity) {
    const quantity = parseInt(newQuantity);
    
    if (quantity < 1 || quantity > 10) {
        showNotification('La cantidad debe estar entre 1 y 10', 'warning');
        renderCart(); // Restaurar valor anterior
        return;
    }
    
    const item = cart.find(c => c.id === itemId);
    if (item) {
        item.quantity = quantity;
        // Simular guardado sin localStorage
        calculateTotals();
    }
}

function removeFromCart(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    // Simular guardado sin localStorage
    renderCart();
    showNotification('Producto eliminado del carrito', 'success');
}

function calculateTotals() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = total.toLocaleString();
}

function handleCheckout() {
    if (cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (confirm(`¿Confirmar compra por Bs${total.toLocaleString()}?`)) {
        cart = [];
        // Simular guardado sin localStorage
        renderCart();
        showNotification('¡Compra realizada exitosamente!', 'success');
    }
}

// === FUNCIONES DE ALMACENAMIENTO ===
// Nota: Las funciones de almacenamiento ya no se usan
// Todos los datos se mantienen solo en memoria durante la sesión

function loadDataFromStorage() {
    // Ya no cargar desde localStorage - solo mantener datos en memoria
    // owners, pets, appointments, cart permanecen como arrays vacíos
}

// === FUNCIONES UTILITARIAS ===

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

// Función para mostrar/ocultar contraseña
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');

    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
    }
}

// Hacer funciones globales para los onclick en HTML
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.togglePassword = togglePassword;
