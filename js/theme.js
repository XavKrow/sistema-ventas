// js/theme.js - Control de modo oscuro

// Función para alternar el tema
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
}

// Función para actualizar la UI del botón
function updateThemeUI(theme) {
    const toggleBtn = document.getElementById('themeToggle');
    const themeText = document.getElementById('themeText');
    const icon = toggleBtn?.querySelector('.icon');
    
    if (!toggleBtn) return;
    
    if (theme === 'dark') {
        if (icon) icon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Modo Claro';
        toggleBtn.style.borderColor = '#667eea';
        toggleBtn.style.background = '#2a2a4a';
        toggleBtn.style.color = '#e0e0e0';
    } else {
        if (icon) icon.textContent = '🌙';
        if (themeText) themeText.textContent = 'Modo Oscuro';
        toggleBtn.style.borderColor = '';
        toggleBtn.style.background = '';
        toggleBtn.style.color = '';
    }
}

// Función para cargar el tema guardado
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeUI(theme);
    
    console.log('🌓 Tema cargado:', theme);
}

// Inicializar el tema al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    
    // Evento para el botón de toggle
    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleTheme);
        console.log('✅ Botón de tema configurado');
    } else {
        console.warn('⚠️ Botón de tema no encontrado');
    }
});

// Escuchar cambios en el sistema (opcional)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        const theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        updateThemeUI(theme);
    }
});

// Exportar funciones para usar en otros archivos
export { toggleTheme, loadTheme, updateThemeUI };