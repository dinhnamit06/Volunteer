const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://volunteer-2.onrender.com';

// Google Identity Services Configuration
let googleTokenClient;
let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
        const isStaff = ['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(user.role);
        window.location.href = isStaff ? 'admin.html' : 'index.html';
    }

    // Try to initialize immediately if already loaded
    initGoogleAuth();
});

// Polyfill/safe-init for Google Auth since the script loads async
function initGoogleAuth() {
    if (typeof google !== 'undefined' && !googleTokenClient) {
        googleTokenClient = google.accounts.oauth2.initTokenClient({
            client_id: '227906357190-l070ghrsh0ojq3gh2noh3t93j14mtcms.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    await handleGoogleAccessToken(tokenResponse.access_token);
                }
            },
        });
    }
}

function togglePassword(iconId, inputId) {
    const passInput = document.getElementById(inputId);
    const toggleIcon = document.getElementById(iconId);

    if (passInput.type === 'password') {
        passInput.type = 'text';
        toggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    } else {
        passInput.type = 'password';
        toggleIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('submit-btn');
    const registerFields = document.getElementById('register-fields');
    const loginExtras = document.getElementById('login-extras');
    const toggleText = document.getElementById('auth-mode-toggle');

    if (isLoginMode) {
        title.textContent = 'Đăng Nhập';
        submitBtn.textContent = 'ĐĂNG NHẬP';
        registerFields.classList.remove('show');
        loginExtras.style.display = 'flex';
        toggleText.innerHTML = 'Bạn chưa có tài khoản? <span onclick="toggleAuthMode()">Đăng ký ngay</span>';
        document.getElementById('reg-name').required = false;
    } else {
        title.textContent = 'Đăng Ký';
        submitBtn.textContent = 'ĐĂNG KÝ';
        registerFields.classList.add('show');
        loginExtras.style.display = 'none';
        toggleText.innerHTML = 'Đã có tài khoản? <span onclick="toggleAuthMode()">Đăng nhập</span>';
        document.getElementById('reg-name').required = true;
    }
    clearErrors();
}

function clearErrors() {
    const errorIds = ['form-error', 'form-success', 'email-error'];
    errorIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.textContent = '';
        }
    });

    // Remove shake classes
    document.querySelector('.auth-card').classList.remove('animate-shake');
}

function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }

    // Animate shaking
    const card = document.querySelector('.auth-card');
    card.classList.remove('animate-shake');
    void card.offsetWidth; // trigger reflow
    card.classList.add('animate-shake');
}

async function handleAuth(e) {
    e.preventDefault();
    clearErrors();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const btn = document.getElementById('submit-btn');
    const originalBtnText = btn.innerHTML;

    // Email validation
    if (!email.endsWith('@st.phenikaa-uni.edu.vn')) {
        showError('email-error', 'Vui lòng sử dụng email sinh viên Phenikaa (@st.phenikaa-uni.edu.vn)');
        return;
    }

    // Password length validation
    if (password.length < 8) {
        showError('form-error', 'Mật khẩu phải có ít nhất 8 ký tự');
        return;
    }

    // Use global baseUrl defined in HTML or default to Render url
    const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'http://localhost:5000';

    let payload = { email, password };
    let endpoint = apiUrl + '/api/login';

    if (!isLoginMode) {
        endpoint = apiUrl + '/api/register';
        payload.name = document.getElementById('reg-name').value.trim();
        if (!payload.name) {
            showError('form-error', 'Vui lòng nhập họ và tên');
            return;
        }
    }

    // Set loading state
    btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg> Đang xử lý...`;
    btn.disabled = true;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (!isLoginMode) {
                const el = document.getElementById('form-success');
                el.textContent = 'Đăng ký thành công! Đang chuyển sang đăng nhập...';
                el.style.display = 'block';
                setTimeout(() => toggleAuthMode(), 1500);
            } else if (data.user) {
                const el = document.getElementById('form-success');
                el.textContent = 'Đăng nhập thành công! Đang chuyển hướng...';
                el.style.display = 'block';

                localStorage.setItem('user', JSON.stringify(data.user));
                setTimeout(() => {
                    const isStaff = ['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(data.user.role);
                    window.location.href = isStaff ? 'admin.html' : 'index.html';
                }, 1000);
            }
        } else {
            showError('form-error', data.message || 'Đã xảy ra lỗi.');
        }
    } catch (error) {
        console.error('Auth Error:', error);
        showError('form-error', 'Không thể kết nối đến máy chủ.');
    } finally {
        if (!response?.ok || isLoginMode === false) { // Don't reset if redirecting on login success
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }
}

async function loginWithGoogle() {
    clearErrors();
    const btn = document.getElementById('google-login-btn');
    const originalBtnText = btn.innerHTML;

    btn.innerHTML = `<svg class="spinner" viewBox="0 0 50 50" style="margin-right: 10px;"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5" stroke="currentColor"></circle></svg> <span>Connecting...</span>`;
    btn.disabled = true;

    try {
        if (!googleTokenClient) {
            initGoogleAuth();
        }
        if (!googleTokenClient) {
            throw new Error("Google Identity Services not loaded.");
        }
        googleTokenClient.requestAccessToken();
    } catch (error) {
        console.warn("Google Login Error:", error);

        // MOCK FALLBACK
        const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        if (isLocalDevelopment) {
            console.log("⚠️ Falling back to Mock Google Login.");
            const mockEmail = 'student@st.phenikaa-uni.edu.vn';
            const mockName = 'Mock User (Google)';
            await processGoogleLoginBackend(mockEmail, mockName);
        } else {
            showError('form-error', 'Google Login failed: ' + error.message);
            btn.innerHTML = originalBtnText;
            btn.disabled = false;
        }
    }
}

async function handleGoogleAccessToken(accessToken) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userInfo = await response.json();
        await processGoogleLoginBackend(userInfo.email, userInfo.name);
    } catch (err) {
        console.error("Failed to fetch Google user info", err);
        showError('form-error', 'Failed to retrieve Google profile.');
        resetGoogleButton();
    }
}

async function processGoogleLoginBackend(email, name) {
    const errorDiv = document.getElementById('form-error');
    const successDiv = document.getElementById('form-success');

    // Client-side domain validation
    if (!email || !email.endsWith('@st.phenikaa-uni.edu.vn')) {
        showError('form-error', 'Vui lòng sử dụng email của trường (@st.phenikaa-uni.edu.vn) để đăng nhập.');
        resetGoogleButton();
        return;
    }

    // Use global baseUrl defined in HTML or default to Render url
    const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'http://localhost:5000';

    try {
        const response = await fetch(apiUrl + '/api/google-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
        });

        const data = await response.json();

        if (response.ok && data.user) {
            successDiv.textContent = 'Google Login successful! Redirecting...';
            successDiv.style.display = 'block';

            localStorage.setItem('user', JSON.stringify(data.user));
            setTimeout(() => {
                const isStaff = ['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(data.user.role);
                window.location.href = isStaff ? 'admin.html' : 'index.html';
            }, 1000);
        } else {
            showError('form-error', data.message || 'Authentication with server failed.');
            resetGoogleButton();
        }
    } catch (err) {
        console.error("Backend Google Login Error:", err);
        showError('form-error', 'Unable to connect to the authentication server.');
        resetGoogleButton();
    }
}

function resetGoogleButton() {
    const btn = document.getElementById('google-login-btn');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48" style="margin-right: 10px;">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                </svg><span>Sign in using Google</span>`;
    btn.disabled = false;
}
