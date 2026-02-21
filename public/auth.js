// API base URL
const API_BASE = '/api';

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.password-strength span');
    
    if (strengthBar) {
        const percentage = (strength / 5) * 100;
        strengthBar.style.width = percentage + '%';
        
        if (percentage <= 20) {
            strengthBar.style.background = '#ef4444';
            strengthText.textContent = 'Weak';
        } else if (percentage <= 40) {
            strengthBar.style.background = '#f59e0b';
            strengthText.textContent = 'Fair';
        } else if (percentage <= 60) {
            strengthBar.style.background = '#3b82f6';
            strengthText.textContent = 'Good';
        } else if (percentage <= 80) {
            strengthBar.style.background = '#10b981';
            strengthText.textContent = 'Strong';
        } else {
            strengthBar.style.background = '#10b981';
            strengthText.textContent = 'Very Strong';
        }
    }
}

// Toggle password visibility
document.querySelectorAll('.toggle-password').forEach(icon => {
    icon.addEventListener('click', function() {
        const input = this.previousElementSibling;
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
});

// Password strength on signup page
const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', (e) => {
        checkPasswordStrength(e.target.value);
    });
}

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Login form handler - FIXED with credentials
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const remember = document.querySelector('input[name="remember"]')?.checked;
        
        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        
        try {
            console.log('🔵 Attempting login for:', email);
            
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // CRITICAL for sessions
            });
            
            console.log('📊 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }
            
            // Store user data
            localStorage.setItem('user', JSON.stringify(data.user));
            if (remember) {
                localStorage.setItem('sessionId', data.sessionId);
            }
            
            // Show success message
            showNotification('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            console.log('➡️ Redirecting to dashboard...');
            window.location.href = '/dashboard';
            
        } catch (error) {
            console.error('❌ Login error:', error);
            showNotification(error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Signup form handler - FIXED with credentials
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        
        // Disable submit button
        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        
        try {
            console.log('🔵 Attempting signup for:', email);
            
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password }),
                credentials: 'include'
            });
            
            console.log('📊 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response data:', data);
            
            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }
            
            showNotification('Account created successfully! Redirecting to login...', 'success');
            
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
            
        } catch (error) {
            console.error('❌ Signup error:', error);
            showNotification(error.message, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Notification function
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add notification styles
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        z-index: 9999;
        animation: slideInRight 0.3s;
        max-width: 350px;
        border-left: 4px solid;
    }
    
    .notification.success {
        border-left-color: #10b981;
    }
    
    .notification.success i {
        color: #10b981;
    }
    
    .notification.error {
        border-left-color: #ef4444;
    }
    
    .notification.error i {
        color: #ef4444;
    }
    
    .notification.info {
        border-left-color: #3b82f6;
    }
    
    .notification.info i {
        color: #3b82f6;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;

document.head.appendChild(style);