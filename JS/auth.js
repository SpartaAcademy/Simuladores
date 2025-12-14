// JS/auth.js - Lógica compartida de autenticación y sesión

const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 Horas
let inactivityTimer;

function isLoggedIn() {
    const expiration = sessionStorage.getItem('sessionExpiration');
    if (!expiration || Date.now() > parseInt(expiration)) {
        clearSession();
        return false;
    }
    resetInactivityTimer();
    return true;
}

function getUserInfo() {
    if (!isLoggedIn()) return null;
    try {
        return JSON.parse(sessionStorage.getItem('userInfo'));
    } catch (e) {
        console.error("Error parsing user info", e);
        clearSession();
        return null;
    }
}

function saveSession(userInfo) {
    const expirationTime = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem('userInfo', JSON.stringify(userInfo));
    sessionStorage.setItem('sessionExpiration', expirationTime.toString());
    resetInactivityTimer();
}

function clearSession() {
    sessionStorage.removeItem('userInfo');
    sessionStorage.removeItem('sessionExpiration');
    clearTimeout(inactivityTimer);
}

// Función principal de cierre de sesión
function logoutUser() {
    clearSession();
    window.location.replace('login.html');
}

function checkAuth() {
    if (!isLoggedIn()) {
        window.location.replace('login.html');
    }
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert("Tu sesión ha expirado por inactividad.");
        logoutUser();
    }, SESSION_TIMEOUT_MS);
}

function setupActivityListeners() {
    ['mousemove', 'keypress', 'click', 'scroll'].forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });
}

// ESTO HACE QUE FUNCIONE EL BOTÓN EN TODOS LADOS
window.logout = logoutUser;
