// portal.js
const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://volunteer-2.onrender.com';

let currentUser = null;
let qrScanner = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        currentUser = JSON.parse(userStr);
        if (['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(currentUser.role)) {
            window.location.href = 'admin.html';
            return;
        }
    } catch (e) {
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
        return;
    }

    // Populate UI
    document.getElementById('user-name').textContent = currentUser.name || "Sinh viên";

    // Fetch dynamic points instead of relying on localStorage
    fetch(`http://localhost:5000/api/profile/${currentUser.id}`)
        .then(res => res.json())
        .then(user => {
            document.getElementById('extra-points').textContent = user.extracurricular_points || 0;
            // Sync point value in currentUser locally if needed
            currentUser.extracurricular_points = user.extracurricular_points;
            localStorage.setItem('user', JSON.stringify(currentUser));
        })
        .catch(err => console.error("Profile load fail", err));

    loadEvents();
    loadHistory();

    setInterval(loadEvents, 60000);
});

async function loadEvents() {
    try {
        const res = await fetch('http://localhost:5000/api/events');
        const events = await res.json();
        const eventList = document.getElementById('event-list');

        if (!events || events.length === 0) {
            eventList.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Không có sự kiện nào hiện khả dụng.</div>`;
            return;
        }

        eventList.innerHTML = events.map(event => {
            const now = new Date();
            const eventStart = new Date(event.start_time);
            const isFull = event.registered_count >= event.capacity;
            const hasStarted = now > eventStart;

            let statusTag = '<span class="event-tag tag-upcoming">Chưa diễn ra</span>';
            let btnText = 'Đăng ký ngay';
            let btnDisabled = '';

            if (hasStarted) {
                statusTag = '<span class="event-tag tag-ended">Đang/Đã diễn ra</span>';
                btnText = 'Hết thời gian đăng ký';
                btnDisabled = 'disabled';
            } else if (isFull) {
                statusTag = '<span class="event-tag tag-ended">Đã đủ số lượng</span>';
                btnText = 'Đã hết chỗ';
                btnDisabled = 'disabled';
            }

            return `
                <div class="event-card animate-fade-in-up">
                    <div style="padding: 15px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: start;">
                        <div style="font-weight: 700; color: var(--primary-dark); font-size: 16px;">${event.title}</div>
                        ${statusTag}
                    </div>
                    <div style="padding: 15px; flex-grow: 1;">
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">📍 ${event.location}</div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">📅 ${new Date(event.start_time).toLocaleString('vi-VN')}</div>
                        <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">👥 ${event.registered_count}/${event.capacity} đã đăng ký</div>
                        
                        <div style="display:flex; gap:8px; margin-bottom:15px; flex-wrap:wrap">
                            <span style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600">Điểm TNV: +${event.ecc_points_volunteer}</span>
                            <span style="background:#fce7f3; color:#be185d; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600">Điểm BTC: +${event.ecc_points_organizer}</span>
                            <span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600">${event.org_level || 'Trường'}</span>
                        </div>

                        <button class="btn-custom btn-primary w-100" onclick="registerEvent(${event.id})" ${btnDisabled}>${btnText}</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) { console.error("Events fail", e); }
}

async function loadHistory() {
    try {
        const apiUrl = baseUrl;
        const res = await fetch(apiUrl + `/api/users/${currentUser.id}/history`);
        const history = await res.json();
        const container = document.getElementById('history-body');

        if (!history || history.length === 0) {
            container.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-muted)">Bạn chưa có lịch sử hoạt động nào.</td></tr>';
            return;
        }

        container.innerHTML = history.map(h => {
            const points = h.role === 'ORGANIZER' ? h.ecc_points_organizer : h.ecc_points_volunteer;
            const statusColor = h.attendance_status === 'Đã điểm danh' ? 'var(--success)' : 'var(--text-muted)';

            let actionsHtml = '';
            if (h.attendance_status === 'Đã điểm danh') {
                actionsHtml += `<button onclick="viewCertificate(${h.event_id})" class="btn-custom btn-outline" style="padding:4px 8px; font-size:12px; margin-right:5px; margin-bottom: 5px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px; vertical-align:-1px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    Xem Chứng Chỉ
                                </button>`;
                if (!h.has_feedback) {
                    actionsHtml += `<button onclick="openFeedback(${h.event_id})" class="btn-custom btn-outline" style="padding:4px 8px; font-size:12px;">Đánh giá</button>`;
                } else {
                    actionsHtml += `<span style="font-size:12px; color:var(--success);">✓ Đã ĐG</span>`;
                }
            }

            return `
                <tr>
                    <td><div style="font-weight:600">${h.title}</div><div style="font-size:12px; color:var(--text-muted)">${h.role === 'ORGANIZER' ? 'Ban tổ chức' : 'Tình nguyện viên'}</div></td>
                    <td><code style="background:#f1f5f9; padding:2px 4px; border-radius:4px">${h.activity_code || '---'}</code></td>
                    <td>${new Date(h.start_time).toLocaleDateString('vi-VN')}</td>
                    <td><span style="font-weight:600; color:${statusColor}">${h.attendance_status}</span></td>
                    <td style="font-weight:700; color:var(--primary-color)">+${h.attendance_status === 'Đã điểm danh' ? points : 0}</td>
                    <td>${actionsHtml}</td>
                </tr>
             `;
        }).join('');
    } catch (e) { console.error("History fail", e); }
}

function openFeedback(eventId) {
    document.getElementById('feedback-event-id').value = eventId;
    document.getElementById('feedback-rating').value = '5';
    document.getElementById('feedback-comment').value = '';
    document.getElementById('feedback-modal').style.display = 'flex';
}

function closeFeedback() {
    document.getElementById('feedback-modal').style.display = 'none';
}

async function submitFeedback(e) {
    e.preventDefault();
    const eventId = document.getElementById('feedback-event-id').value;
    const padding = {
        user_id: currentUser.id,
        rating: document.getElementById('feedback-rating').value,
        comment: document.getElementById('feedback-comment').value
    };
    try {
        const res = await fetch(`http://localhost:5000/api/events/${eventId}/feedbacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(padding)
        });
        if (res.ok) {
            showToast("Thành công", "Gửi đánh giá thành công", "success");
            closeFeedback();
            loadHistory();
        } else {
            showToast("Lỗi", "Không thể gửi đánh giá", "danger");
        }
    } catch (e) {
        showToast("Lỗi", "Lỗi gửi đánh giá", "danger");
    }
}

async function registerEvent(eventId) {
    if (!confirm('Bạn có chắc chắn muốn đăng ký tham gia hoạt động này không?')) return;
    try {
        const res = await fetch('http://localhost:5000/api/register-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, event_id: eventId })
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Thành công", "Đăng ký thành công!", "success");
            loadEvents();
            loadHistory();
        } else {
            showToast("Chú ý", data.message, "warning");
        }
    } catch (e) {
        showToast("Lỗi", "Kết nối máy chủ thất bại", "danger");
    }
}

function startQRScan() {
    document.getElementById('qr-modal').style.display = 'flex';
    qrScanner = new Html5QrcodeScanner("qr-reader", {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        videoConstraints: { facingMode: { exact: "environment" } } // Updated to use exact environment camera
    });
    qrScanner.render(onScanSuccess, onScanError);
}

async function onScanSuccess(decodedText) {
    if (qrScanner) qrScanner.clear();
    try {
        const res = await fetch('http://localhost:5000/api/attendance/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id, qr_code: decodedText })
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Thành công", data.message, "success");
            currentUser.extracurricular_points = (currentUser.extracurricular_points || 0) + (data.extracurricular_points || 0);
            localStorage.setItem('user', JSON.stringify(currentUser));
            document.getElementById('extra-points').textContent = currentUser.extracurricular_points;
            loadHistory();
            if (data.event_id) {
                setTimeout(() => openFeedback(data.event_id), 500);
            }
        } else {
            showToast("Thất bại", data.message, "danger");
        }
    } catch (e) {
        showToast("Lỗi", "Lỗi xử lý mã QR", "danger");
    }
    closeQRScan();
}

function onScanError(e) { }

function closeQRScan() {
    document.getElementById('qr-modal').style.display = 'none';
    if (qrScanner) {
        qrScanner.clear().catch(err => { });
        qrScanner = null;
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

// --- [PROFILE MANAGEMENT] ---
async function openProfile() {
    try {
        if (!currentUser || !currentUser.id) {
            console.error("openProfile: currentUser or ID is missing", currentUser);
            showToast("Lỗi", "Không tìm thấy thông tin người dùng. Vui lòng đăng xuất và đăng nhập lại.", "danger");
            return;
        }

        console.log("Fetching profile for user ID:", currentUser.id);
        const apiUrl = baseUrl;
        const res = await fetch(apiUrl + `/api/profile/${currentUser.id}`);
        const user = await res.json();
        console.log("Profile response:", res.status, user);

        if (res.ok) {
            document.getElementById('prof-name').value = user.name || '';
            document.getElementById('prof-sid').value = user.studentId || user.id || '';
            document.getElementById('prof-major').value = user.major || '';
            document.getElementById('prof-class').value = user.class || '';
            document.getElementById('prof-phone').value = user.phone || '';
            document.getElementById('prof-address').value = user.address || '';

            if (user.dob) {
                // Ensure date format is YYYY-MM-DD for input
                const dob = new Date(user.dob);
                const year = dob.getFullYear();
                const month = String(dob.getMonth() + 1).padStart(2, '0');
                const day = String(dob.getDate()).padStart(2, '0');
                document.getElementById('prof-dob').value = `${year}-${month}-${day}`;
            }

            document.getElementById('profile-modal').style.display = 'flex';
        } else {
            console.error("Profile API error:", user);
            showToast("Lỗi", `Không thể tải thông tin cá nhân: ${user.message || res.status}`, "danger");
        }
    } catch (e) {
        console.error("openProfile exception:", e);
        showToast("Lỗi", "Lỗi kết nối máy chủ", "danger");
    }
}

function closeProfile() {
    document.getElementById('profile-modal').style.display = 'none';
}

async function updateProfile(e) {
    e.preventDefault();
    const payload = {
        userId: document.getElementById('prof-sid').value,
        name: document.getElementById('prof-name').value,
        major: document.getElementById('prof-major').value,
        class: document.getElementById('prof-class').value,
        phone: document.getElementById('prof-phone').value,
        address: document.getElementById('prof-address').value,
        dob: document.getElementById('prof-dob').value
    };

    try {
        const apiUrl = baseUrl;
        const res = await fetch(apiUrl + `/api/profile/${currentUser.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Thành công", "Cập nhật thông tin thành công!", "success");
            // Update local storage and UI - convert to number to prevent type mismatches
            if (payload.userId) currentUser.id = parseInt(payload.userId) || payload.userId;
            currentUser.name = payload.name;
            localStorage.setItem('user', JSON.stringify(currentUser));
            document.getElementById('user-name').textContent = currentUser.name;
            closeProfile();
        } else {
            showToast("Thất bại", "Không thể lưu thông tin", "danger");
        }
    } catch (e) {
        showToast("Lỗi", "Lỗi kết nối máy chủ", "danger");
    }
}

function showToast(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-fade-in-up`;
    const icons = { success: '✅', danger: '❌', warning: '⚠️' };
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Certificate Logic ---
let currentCertificateFilename = "Chung_Chi_Phenikaa.png";

async function viewCertificate(eventId) {
    try {
        const studentId = currentUser.id;
        const apiUrl = 'http://localhost:5000';
        const res = await fetch(apiUrl + `/api/admin/students/${studentId}/certificate/${eventId}`);
        if (!res.ok) {
            const err = await res.json();
            return showToast("Lỗi", err.message || "Không thể tải chứng chỉ", "danger");
        }
        const data = await res.json();

        // Populate the Template Data
        document.getElementById('cert-student-name').textContent = data.studentName;
        document.getElementById('cert-student-id').textContent = data.studentId;
        document.getElementById('cert-student-class').textContent = data.studentClass;
        document.getElementById('cert-student-major').textContent = data.studentMajor;

        document.getElementById('cert-event-name').textContent = data.eventName;
        document.getElementById('cert-points').textContent = data.points;


        const date = new Date(data.issueDate);
        document.getElementById('cert-day').textContent = String(date.getDate()).padStart(2, '0');
        document.getElementById('cert-month').textContent = String(date.getMonth() + 1).padStart(2, '0');
        document.getElementById('cert-year').textContent = date.getFullYear();

        // Determine Filename
        const cleanName = data.studentName.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
        currentCertificateFilename = `ChungChi_${cleanName}_${data.studentId}.png`;

        // Show Modal
        document.getElementById('certificate-modal').style.display = 'flex';
    } catch (err) {
        showToast("Lỗi", "Kết nối hệ thống thất bại", "danger");
        console.error(err);
    }
}

function closeCertificateModal() {
    document.getElementById('certificate-modal').style.display = 'none';
}

function downloadCertificateImage() {
    const element = document.getElementById('certificate-template');

    const btn = document.querySelector('#certificate-modal .btn-primary') || document.querySelector('.btn-primary');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = `<div class="spinner" style="width:15px; height:15px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:5px;"></div> Đang xuất...`;
        btn.disabled = true;
    }

    // Set temporary scale for better image quality
    const prevTransform = element.style.transform;
    element.style.transform = 'none';

    html2canvas(element, {
        scale: 2, // higher resolution
        useCORS: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        // Restore transform if any
        element.style.transform = prevTransform;

        const imgData = canvas.toDataURL('image/png');

        // Trigger download
        const link = document.createElement('a');
        link.download = currentCertificateFilename;
        link.href = imgData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Thành công", "Đã tải xuống ảnh chứng chỉ", "success");
    }).catch(err => {
        showToast("Lỗi", "Không thể xuất ảnh", "danger");
        console.error(err);
    }).finally(() => {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}
