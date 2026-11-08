
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login");
}

const historyBody = document.getElementById("leaveHistoryBody");

async function loadLeaveHistory() {
    try {
        const response = await fetch("/api/leaves/my", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load leave history.");
        }

        // Safely get leave records and sort oldest first
        const leaves = Array.isArray(data.leaves)
            ? [...data.leaves].sort((a, b) => a.request_id - b.request_id)
            : [];

        // Summary counts
        document.getElementById("totalRequests").textContent =
            leaves.length;

        document.getElementById("pendingRequests").textContent =
            leaves.filter(leave => leave.status === "pending").length;

        document.getElementById("approvedRequests").textContent =
            leaves.filter(leave => leave.status === "approved").length;

        document.getElementById("rejectedRequests").textContent =
            leaves.filter(leave => leave.status === "rejected").length;

        // Empty state
        if (leaves.length === 0) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty">
                        No leave requests available yet.
                    </td>
                </tr>
            `;
            return;
        }

        // Display leave records with serial numbers
        historyBody.innerHTML = leaves.map((leave, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHTML(leave.leave_type || "-")}</td>
                <td>${formatDate(leave.from_date)}</td>
                <td>${formatDate(leave.to_date)}</td>
                <td>${Number(leave.total_days) || 0}</td>
                <td>${escapeHTML(leave.reason || "-")}</td>
                <td>
                    <span class="status ${escapeHTML(leave.status || "")}">
                        ${escapeHTML((leave.status || "unknown").toUpperCase())}
                    </span>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error("Leave History Error:", error);

        historyBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty">
                    ${escapeHTML(error.message)}
                </td>
            </tr>
        `;
    }
}

// Format date as DD-MM-YYYY
function formatDate(dateValue) {
    if (!dateValue) return "-";

    const date = String(dateValue).substring(0, 10);
    const [year, month, day] = date.split("-");

    return `${day}-${month}-${year}`;
}

// Prevent HTML injection
function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

// Load leave history
if (token && user) {
    loadLeaveHistory();
}
