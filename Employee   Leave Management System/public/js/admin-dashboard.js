
const requestsTableBody = document.getElementById('requestsTableBody');
const pendingCount = document.getElementById('pendingCount');
const message = document.getElementById('message');
const logoutButton = document.getElementById('logoutButton');

// Get login details
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || 'null');

// Admin Login Verification
if (!token || !user || user.role !== 'admin') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/login');
} else {

    // Load pending leave requests
    loadPendingRequests();
}

// Load pending requests from database
async function loadPendingRequests() {
    try {
        message.textContent = '';

        const response = await fetch('/api/leaves/admin/pending', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to load requests.');
        }

        displayRequests(data.requests || []);

    } catch (error) {
        console.error('Loading Error:', error);

        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="9">Unable to load leave requests.</td>
            </tr>
        `;

        message.textContent = error.message;
    }
}

// Display requests
function displayRequests(requests) {
    pendingCount.textContent = requests.length;

    if (requests.length === 0) {
        requestsTableBody.innerHTML = `
            <tr>
                <td colspan="9">No pending leave requests found.</td>
            </tr>
        `;
        return;
    }

    requestsTableBody.innerHTML = requests.map((request, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHTML(request.employee_name || request.name || '')}</td>
            <td>${escapeHTML(request.email || '')}</td>
            <td>${escapeHTML(request.leave_type || request.type_name || '')}</td>
            <td>${formatDate(request.from_date)}</td>
            <td>${formatDate(request.to_date)}</td>
            <td>${Number(request.total_days) || 0}</td>
            <td>${escapeHTML(request.reason || '')}</td>
            <td>
                <button class="action-btn approve-btn"
                    onclick="makeDecision(${Number(request.request_id)}, 'approved')">
                    Approve
                </button>

                <button class="action-btn reject-btn"
                    onclick="makeDecision(${Number(request.request_id)}, 'rejected')">
                    Reject
                </button>
            </td>
        </tr>
    `).join('');
}

// Approve or Reject
async function makeDecision(requestId, decision) {

    const action = decision === 'approved' ? 'approve' : 'reject';

    if (!confirm(`Are you sure you want to ${action} this leave request?`)) {
        return;
    }

    try {
        message.textContent = 'Processing request...';

        const response = await fetch(
            `/api/leaves/admin/decision/${requestId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    decision: decision
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'Unable to process request.');
        }

        message.textContent = data.message ||
            `Leave request ${decision} successfully!`;

        // Refresh pending requests
        await loadPendingRequests();

    } catch (error) {
        console.error('Decision Error:', error);
        message.textContent = error.message;
    }
}

// Format date
function formatDate(dateValue) {
    if (!dateValue) return '-';

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-GB');
}

// Prevent HTML injection
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[character]);
}

// Logout
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.replace('/login');
});
