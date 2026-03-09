// admin.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check Authentication
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        currentUser = JSON.parse(userStr);
        if (!['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(currentUser.role)) {
            window.location.href = 'index.html';
            return;
        }
    } catch (e) {
        localStorage.removeItem('user');
        window.location.href = 'auth.html';
        return;
    }

    // Populate UI
    document.getElementById('admin-name').textContent = currentUser.name || "Admin";
    const roleEl = document.querySelector('.admin-role');
    if (roleEl) {
        roleEl.textContent = 'Staff';
    }

    initializeFilters();
    loadStats();
    loadEvents();

    const createForm = document.getElementById('create-event-form');
    if (createForm) createForm.addEventListener('submit', createEvent);
});

function initializeFilters() {
    const yearSelects = [document.getElementById('filter-year'), document.getElementById('overview-filter-year')];
    const semSelects = [document.getElementById('filter-semester'), document.getElementById('overview-filter-semester')];

    // Generate school years from 2026-2027 to 2040-2041
    let options = '<option value="All">Tất cả năm học</option>';
    for (let i = 2026; i <= 2040; i++) {
        options += `<option value="${i}-${i + 1}">${i}-${i + 1}</option>`;
    }

    // Set defaults based on current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    let defaultYear = currentYear;
    let defaultSemester = "1";

    if (currentMonth >= 1 && currentMonth <= 4) {
        defaultSemester = "1";
    } else if (currentMonth >= 5 && currentMonth <= 8) {
        defaultSemester = "2";
    } else {
        defaultSemester = "3";
    }

    const yearString = `${defaultYear}-${defaultYear + 1}`;

    yearSelects.forEach(select => {
        if (select) {
            select.innerHTML = options;
            select.value = yearString;
        }
    });

    semSelects.forEach(select => {
        if (select) {
            select.value = defaultSemester;
        }
    });
}

async function loadStats() {
    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        let url = apiUrl + '/api/dashboard/stats';
        const yearSelect = document.getElementById('overview-filter-year');
        const semSelect = document.getElementById('overview-filter-semester');

        if (yearSelect && semSelect) {
            const year = yearSelect.value;
            const sem = semSelect.value;
            url += `?semester=${sem}&year=${year}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        animateValue('total-events', 0, data.events.total_events || 0, 1000);
        animateValue('total-volunteers', 0, data.students.total_volunteers || 0, 1000);
    } catch (error) { console.error("Stats fail", error); }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj || isNaN(end)) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

async function loadEvents() {
    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        let url = apiUrl + '/api/events';
        const yearSelect = document.getElementById('overview-filter-year');
        const semSelect = document.getElementById('overview-filter-semester');

        if (yearSelect && semSelect) {
            const year = yearSelect.value;
            const sem = semSelect.value;
            url += `?semester=${sem}&year=${year}`;
        }

        const res = await fetch(url);
        const events = await res.json();

        // Populate selects
        let options = '<option value="">Chọn sự kiện</option>';
        events.forEach(e => {
            options += `<option value="${e.id}">${e.title}</option>`;
        });

        const eventSelect = document.getElementById('event-select');
        const qrEventSelect = document.getElementById('qr-event-select');
        if (eventSelect) eventSelect.innerHTML = options;
        if (qrEventSelect) qrEventSelect.innerHTML = options;

        // Populate admin list
        const listContainer = document.getElementById('admin-event-list');
        if (listContainer) {
            if (events.length === 0) {
                listContainer.innerHTML = '<div class="empty-state">Chưa có sự kiện nào.</div>';
                return;
            }

            listContainer.innerHTML = events.map(e => `
                <div class="stat-card mb-3" style="display:flex; justify-content:space-between; align-items:center; padding:15px">
                    <div>
                        <div style="font-weight:700; color:var(--text-main)">${e.title}</div>
                        <div style="font-size:12px; color:var(--text-muted)">${e.activity_code || 'N/A'} | ${new Date(e.start_time).toLocaleDateString('vi-VN')}</div>
                    </div>
                    <button onclick="deleteEvent(${e.id})" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:12px">Xóa</button>
                </div>
            `).join('');
        }
    } catch (error) { console.error("Events fail", error); }
}

async function createEvent(e) {
    e.preventDefault();
    const btn = document.getElementById('create-btn');
    const originalText = btn.innerHTML;

    btn.innerHTML = `Creating...`;
    btn.disabled = true;

    const payload = {
        title: document.getElementById('event-title').value,
        activity_code: document.getElementById('event-code').value,
        org_level: document.getElementById('event-org').value,
        activity_type: document.getElementById('event-type').value,
        activity_nature: document.getElementById('event-nature').value,
        description: document.getElementById('event-description').value,
        location: document.getElementById('event-location').value,
        start_time: document.getElementById('event-start').value,
        end_time: document.getElementById('event-end').value,
        capacity: parseInt(document.getElementById('event-capacity').value),
        target_audience: document.getElementById('event-audience').value,
        ecc_points_volunteer: parseFloat(document.getElementById('event-tnv').value) || 0,
        ecc_points_organizer: parseFloat(document.getElementById('event-btc').value) || 0,
        created_by: currentUser.id
    };

    try {
        const res = await fetch('https://volunteer-management-05dn.onrender.com/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Thành công", "Đã tạo sự kiện mới", "success");
            e.target.reset();
            // Xóa dòng closeModal vì form không còn nằm trong modal nữa
            loadEvents();
            loadStats();

            // Tự động chuyển qua tab danh sách sự kiện nếu muốn, hoặc giữ nguyên
        } else {
            const data = await res.json();
            showToast("Lỗi", data.message, "danger");
        }
    } catch (err) {
        showToast("Lỗi", "Kết nối thất bại", "danger");
        console.error(err);
    }
    finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteEvent(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) return;
    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/events/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast("Thành công", "Đã xóa sự kiện", "success");
            loadEvents();
            loadStats();
        }
    } catch (err) { showToast("Lỗi", "Không thể xóa", "danger"); }
}

async function showQR() {
    const eventId = document.getElementById('qr-event-select').value;
    if (!eventId) return showToast("Chú ý", "Hãy chọn sự kiện", "warning");

    const container = document.getElementById('qr-projector');
    container.innerHTML = `<div class="qr-placeholder">Đang tạo...</div>`;
    container.style.display = 'block';

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/events/qr/${eventId}`);
        const data = await res.json();
        if (res.ok) {
            container.innerHTML = `
                <div class="qr-container animate-fade-in-up">
                    <img src="${data.qr_image_url}" class="qr-image">
                    <div class="qr-string">${data.qr_code}</div>
                    <p class="qr-instruction">Quét bằng ứng dụng TNV Phenikaa để điểm danh</p>
                </div>
            `;
        }
    } catch (e) { container.innerHTML = "Lỗi tạo QR"; }
}

async function loadCheckins() {
    const eventId = document.getElementById('event-select').value;
    const container = document.getElementById('checkin-container');

    if (!eventId) {
        container.innerHTML = `<div class="empty-state">Chọn sự kiện để xem danh sách</div>`;
        return;
    }

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/events/${eventId}/checkins`);
        const data = await res.json();

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="empty-state">Chưa có ai đăng ký.</div>`;
            document.getElementById('export-section').style.display = 'none';
            return;
        }

        document.getElementById('export-section').style.display = 'block';

        const registered = data.filter(c => c.attendance_status !== 'Đã điểm danh');
        const attended = data.filter(c => c.attendance_status === 'Đã điểm danh');

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:15px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">
                <h3 style="font-size:16px; color:var(--text-main); margin:0;">Danh sách đã đăng ký (${registered.length})</h3>
            </div>
            <table class="table-custom animate-fade-in-up">
                <thead>
                    <tr>
                        <th>Tên / MSV</th>
                        <th>Trạng thái</th>
                        <th>Vai trò</th>
                        <th>Thời gian ĐK</th>
                    </tr>
                </thead>
                <tbody>
                    ${registered.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-3">Không có.</td></tr>' : registered.map(c => `
                        <tr>
                            <td>
                                <div class="student-name">${c.name}</div>
                                <div class="student-email">${c.student_id} ${c.class ? ' | ' + c.class : ''}</div>
                                <div style="font-size:11px; color:var(--text-muted)">${c.major || ''}</div>
                            </td>
                            <td><span style="color:var(--text-muted)">Chưa điểm danh</span></td>
                            <td>
                                <select class="form-control" style="padding: 2px 5px; font-size: 12px; height: auto;" onchange="changeParticipantRole(${eventId}, ${c.student_id}, this.value)">
                                    <option value="VOLUNTEER" ${c.participant_role !== 'ORGANIZER' ? 'selected' : ''}>TNV</option>
                                    <option value="ORGANIZER" ${c.participant_role === 'ORGANIZER' ? 'selected' : ''}>Ban Tổ Chức</option>
                                </select>
                            </td>
                            <td>${c.registered_at ? new Date(c.registered_at).toLocaleTimeString('vi-VN') : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:30px; border-bottom:1px solid #e2e8f0; padding-bottom:5px;">
                <h3 style="font-size:16px; color:var(--text-main); margin:0;">Danh sách đã điểm danh (${attended.length})</h3>
            </div>
            <table class="table-custom animate-fade-in-up">
                <thead>
                    <tr>
                        <th>Tên / MSV</th>
                        <th>Trạng thái</th>
                        <th>Vai trò</th>
                        <th>Thời gian điểm danh</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${attended.length === 0 ? '<tr><td colspan="4" class="text-center text-muted py-3">Không có.</td></tr>' : attended.map(c => `
                        <tr>
                            <td>
                                <div class="student-name">${c.name}</div>
                                <div class="student-email">${c.student_id} ${c.class ? ' | ' + c.class : ''}</div>
                                <div style="font-size:11px; color:var(--text-muted)">${c.major || ''}</div>
                            </td>
                            <td><span style="color:var(--success)">Đã điểm danh</span></td>
                            <td>
                                <select class="form-control" style="padding: 2px 5px; font-size: 12px; height: auto;" onchange="changeParticipantRole(${eventId}, ${c.student_id}, this.value)">
                                    <option value="VOLUNTEER" ${c.participant_role !== 'ORGANIZER' ? 'selected' : ''}>TNV</option>
                                    <option value="ORGANIZER" ${c.participant_role === 'ORGANIZER' ? 'selected' : ''}>Ban Tổ Chức</option>
                                </select>
                            </td>
                            <td>${c.checkin_time ? new Date(c.checkin_time).toLocaleTimeString('vi-VN') : '-'}</td>
                            <td>
                                <button class="btn-custom btn-outline" style="padding:4px 8px; font-size:12px;" onclick="viewCertificate(${c.student_id}, ${eventId})">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px; vertical-align:-1px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    Xem Chứng Chỉ
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) { container.innerHTML = "Lỗi tải danh sách"; }
}

async function changeParticipantRole(eventId, studentId, role) {
    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/admin/events/${eventId}/participants/${studentId}/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requester_id: currentUser.id, role })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Thành công", data.message, "success");
        } else {
            showToast("Lỗi", data.message, "danger");
            loadCheckins(); // reload to revert to actual state
        }
    } catch (err) {
        showToast("Lỗi", "Kết nối thất bại", "danger");
        loadCheckins();
    }
}

let allMembers = [];

async function loadStudents() {
    const tableBody = document.getElementById('member-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner"></div></td></tr>';

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        let url = apiUrl + '/api/admin/students';
        const yearSelect = document.getElementById('filter-year');
        const semSelect = document.getElementById('filter-semester');

        if (yearSelect && semSelect) {
            const year = yearSelect.value;
            const sem = semSelect.value;
            url += `?semester=${sem}&year=${year}`;
        }

        const res = await fetch(url);
        allMembers = await res.json();
        renderMembers(allMembers);
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Lỗi tải dữ liệu</td></tr>';
    }
}

function renderMembers(members) {
    const tableBody = document.getElementById('member-table-body');
    if (members.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Không tìm thấy sinh viên nào.</td></tr>';
        return;
    }

    tableBody.innerHTML = members.map(m => `
        <tr class="animate-fade-in-up">
            <td>
                <div class="student-name">${m.name}</div>
                <div class="student-email">${m.msv}</div>
            </td>
            <td>
                <div class="student-class">${m.class || '---'}</div>
                <div style="font-size: 11px; color: var(--text-muted)">${m.major || '---'}</div>
            </td>
            <td>
                ${m.role === 'STAFF' ? '<span class="badge badge-staff-regular">Staff</span>' :
            '<span class="badge badge-student">TNV / Sinh viên</span>'}
            </td>
            <td>
                <span class="badge" style="background: var(--primary-light); color: var(--primary-dark); padding: 4px 10px; border-radius: 20px; font-weight: 700; cursor: pointer;" onclick="viewPointsHistory(${m.id}, '${m.name}')" title="Xem lịch sử">
                    ${m.points} Điểm
                </span>
            </td>
            <td>
                <button class="btn-custom btn-outline" style="padding: 4px 8px; font-size: 12px; margin-right: 5px;" onclick="viewPointsHistory(${m.id}, '${m.name}')">Lịch sử</button>
                ${['STAFF', 'SCHOOL_STAFF', 'REGULAR_STAFF'].includes(currentUser.role) ? `
                    <button class="btn-custom btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="openPointsModal(${m.id}, '${m.name}')">+ Điểm</button>
                    ${currentUser.role === 'SCHOOL_STAFF' ? `<button class="btn-custom" style="padding: 4px 8px; font-size: 12px; background: var(--danger); color: white; border: none; margin-left: 5px;" onclick="deleteUser(${m.id})">Xoá</button>` : ''}
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// --- Points Management Functions ---
function openPointsModal(userId, userName) {
    document.getElementById('points-student-id').value = userId;
    document.getElementById('points-student-name').textContent = userName;
    document.getElementById('points-amount').value = '';
    document.getElementById('points-reason').value = '';
    document.getElementById('add-points-modal').style.display = 'flex';
}

function closePointsModal() {
    document.getElementById('add-points-modal').style.display = 'none';
}

async function submitPoints() {
    const userId = document.getElementById('points-student-id').value;
    const amount = document.getElementById('points-amount').value;
    const reason = document.getElementById('points-reason').value;

    if (!amount || !reason) return showToast("Lỗi", "Vui lòng nhập đầy đủ thông tin", "warning");

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/admin/students/${userId}/add-points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requester_id: currentUser.id, amount, reason })
        });
        const data = await res.json();

        if (res.ok) {
            showToast("Thành công", data.message, "success");
            closePointsModal();
            loadStudents();
            // Also refresh overall stats just in case
            loadStats();
        } else {
            showToast("Lỗi", data.message, "danger");
        }
    } catch (err) {
        showToast("Lỗi", "Không thể kết nối", "danger");
    }
}

async function viewPointsHistory(userId, userName) {
    document.getElementById('history-student-name').textContent = userName;
    const tbody = document.getElementById('points-history-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner"></div></td></tr>';
    document.getElementById('history-points-modal').style.display = 'flex';

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/admin/students/${userId}/points-history`);
        const data = await res.json();

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">Chưa có lịch sử cộng/trừ điểm nào.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${new Date(r.date).toLocaleString('vi-VN')}</td>
                <td>${r.reason}</td>
                <td><span class="badge" style="background:#f1f5f9; color:#475569;">${r.staff_name}</span></td>
                <td><span style="font-weight:700; color:${r.amount >= 0 ? 'var(--success)' : 'var(--danger)'}">${r.amount > 0 ? '+' : ''}${r.amount}</span></td>
            </tr>
        `).join('');

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">Lỗi tải dữ liệu.</td></tr>';
    }
}

function closeHistoryModal() {
    document.getElementById('history-points-modal').style.display = 'none';
}

// --- Certificate Logic ---
let currentCertificateFilename = "Chung_Chi_Phenikaa.png";

async function viewCertificate(studentId, eventId) {
    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
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

// End Points Management

async function promoteStaff(userId) {
    if (!confirm("Bạn có chắc chắn muốn phong thành viên này làm Staff?")) return;
    try {
        const res = await fetch('https://volunteer-management-05dn.onrender.com/api/admin/promote-staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requester_id: currentUser.id, target_user_id: userId })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Thành công", data.message, "success");
            loadStudents(); // Refresh list to show new role
        } else {
            showToast("Lỗi", data.message, "danger");
        }
    } catch (err) {
        showToast("Lỗi", "Không thể kết nối server", "danger");
    }
}

async function deleteUser(userId) {
    if (!confirm("Bạn có chắc chắn muốn XOÁ tài khoản này? Thao tác này không thể hoàn tác!")) return;
    try {
        const res = await fetch('https://volunteer-management-05dn.onrender.com/api/admin/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requester_id: currentUser.id, target_user_id: userId })
        });
        const data = await res.json();
        if (res.ok) {
            showToast("Thành công", data.message, "success");
            loadStudents();
        } else {
            showToast("Lỗi", data.message, "danger");
        }
    } catch (err) {
        showToast("Lỗi", "Không thể kết nối server", "danger");
    }
}

function filterMembers() {
    const query = document.getElementById('member-search').value.toLowerCase();
    const filtered = allMembers.filter(m =>
        (m.name || '').toString().toLowerCase().includes(query) ||
        (m.msv || '').toString().toLowerCase().includes(query) ||
        (m.class || '').toString().toLowerCase().includes(query) ||
        (m.email || '').toString().toLowerCase().includes(query)
    );
    renderMembers(filtered);
}

async function exportCSV() {
    const eventId = document.getElementById('event-select').value;
    if (!eventId) return showToast("Chú ý", "Bạn chưa chọn sự kiện nào", "warning");

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/events/${eventId}/checkins`);
        const data = await res.json();

        let csvContent = "\uFEFF"; // BOM for UTF-8 Excel support
        csvContent += "STT,Ho va Ten,MSV,Lop,Nganh Hoc,Vai tro,Trang Thai,Thoi Gian Dang Ky,Thoi Gian Diem Danh\n";

        data.forEach((row, idx) => {
            let stt = idx + 1;
            let name = `"${row.name || ''}"`;
            let msv = `"${row.student_id || ''}"`;
            let clazz = `"${row.class || ''}"`;
            let major = `"${row.major || ''}"`;
            let role = `"${row.participant_role === 'ORGANIZER' ? 'Ban Tổ Chức' : 'TNV'}"`;
            let status = `"${row.attendance_status || ''}"`;
            let regTime = row.registered_at ? `"${new Date(row.registered_at).toLocaleString('vi-VN')}"` : '""';
            let checkTime = row.checkin_time ? `"${new Date(row.checkin_time).toLocaleString('vi-VN')}"` : '""';
            csvContent += `${stt},${name},${msv},${clazz},${major},${role},${status},${regTime},${checkTime}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `DiemDanh_SK_${eventId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        showToast("Lỗi", "Không thể xuất file", "danger");
    }
}

async function exportExcelFile() {
    if (typeof XLSX === 'undefined') {
        return showToast("Lỗi", "Thư viện Excel chưa được tải", "danger");
    }
    const eventId = document.getElementById('event-select').value;
    if (!eventId) return showToast("Chú ý", "Bạn chưa chọn sự kiện nào", "warning");

    try {
        const apiUrl = typeof baseUrl !== 'undefined' ? baseUrl : 'https://volunteer-management-05dn.onrender.com';
        const res = await fetch(apiUrl + `/api/events/${eventId}/checkins`);
        const data = await res.json();

        if (!data || data.length === 0) {
            return showToast("Chú ý", "Không có dữ liệu để xuất", "warning");
        }

        const formattedData = data.map((row, index) => ({
            "STT": index + 1,
            "Họ và Tên": row.name || '',
            "Mã Sinh Viên": row.student_id || '',
            "Lớp": row.class || '',
            "Ngành học": row.major || '',
            "Vai trò": row.participant_role === 'ORGANIZER' ? 'Ban Tổ Chức' : 'TNV',
            "Trạng thái": row.attendance_status || '',
            "Thời gian đăng ký": row.registered_at ? new Date(row.registered_at).toLocaleString('vi-VN') : '',
            "Thời gian điểm danh": row.checkin_time ? new Date(row.checkin_time).toLocaleString('vi-VN') : ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(formattedData);

        const colWidths = [
            { wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 22 }, { wch: 22 }
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_diem_danh");
        XLSX.writeFile(wb, `DiemDanh_SK_${eventId}.xlsx`);

    } catch (err) {
        showToast("Lỗi", "Không thể xuất file", "danger");
        console.error(err);
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'auth.html';
}

function switchTab(tabId, el) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (el) {
        if (typeof el === 'string') {
            const navEl = document.getElementById(el);
            if (navEl) navEl.classList.add('active');
        } else {
            el.classList.add('active');
        }
    } else {
        const navMap = {
            'overview': 'nav-overview',
            'manage-events': 'nav-events',
            'checkin': 'nav-checkin',
            'members': 'nav-members'
        };
        const navEl = document.getElementById(navMap[tabId]);
        if (navEl) navEl.classList.add('active');
    }

    // Update active tab content
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const targetTab = document.getElementById(`${tabId}-tab`);
    if (targetTab) targetTab.classList.add('active');

    // Update page title
    const titles = {
        'overview': 'Trang Tổng Quan',
        'manage-events': 'Quản Lý Sự Kiện',
        'checkin': 'Điểm Danh & QR',
        'members': 'Quản Lý Thành Viên'
    };
    if (titles[tabId]) {
        document.getElementById('current-page-title').textContent = titles[tabId];
    }

    if (tabId === 'members') loadStudents();

    // Close sidebar on mobile after switching tab
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('admin-sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
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
