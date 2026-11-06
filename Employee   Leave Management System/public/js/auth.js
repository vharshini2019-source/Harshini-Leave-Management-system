
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const message = document.getElementById('message');
    const loginButton = document.getElementById('loginButton');
    const rememberMe = document.getElementById('rememberMe');
    const emailInput = document.getElementById('email');

    // Show / Hide Password
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';

            passwordInput.type = isPassword ? 'text' : 'password';
            togglePassword.textContent = isPassword ? 'Hide' : 'Show';
        });
    }

    // Restore remembered email
    emailInput.value = localStorage.getItem('rememberedEmail') || '';

    // Login API
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        message.textContent = '';
        message.style.color = '#dc2626';

        loginButton.disabled = true;
        loginButton.textContent = 'Signing In...';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Login failed.');
            }

            // Save authentication details
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Remember email
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            message.style.color = '#059669';

            // Role-based redirect
            if (data.user.role === 'admin') {
                message.textContent = 'Admin login successful!';
                window.location.replace('/admin-dashboard');

            } else if (data.user.role === 'employee') {
                message.textContent = 'Employee login successful!';
                window.location.replace('/dashboard');

            } else {
                throw new Error('Invalid user role.');
            }

        } catch (error) {
            message.style.color = '#dc2626';
            message.textContent = error.message;

            loginButton.disabled = false;
            loginButton.innerHTML = 'Sign In <span>→</span>';
        }
    });
}
