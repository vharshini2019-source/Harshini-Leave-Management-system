
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

const employeeNameElement = document.getElementById("employeeName");
const employeeEmailElement = document.getElementById("employeeEmail");
const totalBalanceElement = document.getElementById("totalBalance");
const pendingElement = document.getElementById("pendingRequests");
const approvedElement = document.getElementById("approvedLeaves");
const rejectedElement = document.getElementById("rejectedLeaves");
const tableBody = document.getElementById("leaveTableBody");

// Check login
if (!token || !user) {
    window.location.replace("/login");
}

// Display employee details
if (user) {
    employeeEmailElement.textContent = user.email || "Employee";

    employeeNameElement.textContent =
        user.name || user.employeeName ||
        (user.email ? user.email.split("@")[0] : "Employee");
}

// Logout
document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("/login");
});

// Format date
function formatDate(value) {
    if (!value) return "-";

    const date = String(value).substring(0, 10);
    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

// Prevent HTML injection
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Load leave history
async function loadLeaveRequests() {
    const response = await fetch("/api/leaves/my", {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load leave requests.");
    }

    const leaves = data.leaves || [];

    const pending = leaves.filter(
        leave => String(leave.status).toLowerCase() === "pending"
    ).length;

    const approved = leaves.filter(
        leave => String(leave.status).toLowerCase() === "approved"
    ).length;

    const rejected = leaves.filter(
        leave => String(leave.status).toLowerCase() === "rejected"
    ).length;

    pendingElement.textContent = pending;
    approvedElement.textContent = approved;
    rejectedElement.textContent = rejected;

    // Latest five requests
    const recentLeaves = [...leaves]
        .sort((a, b) => Number(b.request_id) - Number(a.request_id))
        .slice(0, 5);

    if (recentLeaves.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    No leave requests available yet.
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = recentLeaves.map(leave => {
        const status = String(leave.status || "").toLowerCase();

        const safeStatus = [
            "pending", "approved", "rejected"
        ].includes(status) ? status : "pending";

        return `
            <tr>
                <td>${escapeHTML(leave.leave_type)}</td>
                <td>${formatDate(leave.from_date)}</td>
                <td>${formatDate(leave.to_date)}</td>
                <td>${Number(leave.total_days) || 0}</td>
                <td>
                    <span class="status ${safeStatus}">
                        ${escapeHTML(safeStatus.toUpperCase())}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}

// Load leave balance separately
async function loadLeaveBalance() {
    try {
        const response = await fetch("/api/leaves/balance", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load balance.");
        }

        totalBalanceElement.textContent =
            Number(data.availableDays) || 0;

    } catch (error) {
        console.error("Balance Error:", error);
        totalBalanceElement.textContent = "--";
    }
}

// Load complete dashboard
async function loadDashboard() {
    if (!token || !user) return;

    try {
        await loadLeaveRequests();
    } catch (error) {
        console.error("Dashboard Error:", error);

        pendingElement.textContent = "--";
        approvedElement.textContent = "--";
        rejectedElement.textContent = "--";

        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-message">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }

    await loadLeaveBalance();
}

// Start dashboard
loadDashboard();
