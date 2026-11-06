
const leaveForm = document.getElementById("leaveForm");
const leaveType = document.getElementById("leaveType");
const fromDate = document.getElementById("fromDate");
const toDate = document.getElementById("toDate");
const reason = document.getElementById("reason");
const message = document.getElementById("formMessage");
const submitButton = document.getElementById("submitButton");

const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login");
}

function getToday() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000)
        .toISOString().split("T")[0];
}

const today = getToday();

if (fromDate && toDate) {
    fromDate.min = today;
    toDate.min = today;

    fromDate.addEventListener("change", () => {
        toDate.min = fromDate.value || today;

        if (toDate.value && toDate.value < fromDate.value) {
            toDate.value = "";
        }
    });
}

if (leaveForm) {
    leaveForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        message.textContent = "";
        message.style.color = "#dc2626";

        const selectedType = leaveType.value.trim();
        const startDate = fromDate.value;
        const endDate = toDate.value;
        const leaveReason = reason.value.trim();

        if (!selectedType || !startDate || !endDate || !leaveReason) {
            message.textContent = "Please fill all required fields.";
            return;
        }

        if (startDate < today) {
            message.textContent = "Past dates cannot be selected.";
            return;
        }

        if (endDate < startDate) {
            message.textContent = "To Date cannot be earlier than From Date.";
            return;
        }

        if (leaveReason.length < 5) {
            message.textContent = "Reason must contain at least 5 characters.";
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            const response = await fetch("/api/leaves/apply", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    leaveType: selectedType,
                    fromDate: startDate,
                    toDate: endDate,
                    reason: leaveReason
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Unable to submit leave application."
                );
            }

            message.style.color = "#059669";
            message.textContent = data.message ||
                "Leave application submitted successfully!";

            leaveForm.reset();
            fromDate.min = today;
            toDate.min = today;

        } catch (error) {
            message.style.color = "#dc2626";
            message.textContent = error.message ||
                "Server connection failed. Please try again.";

            console.error("Apply Leave Error:", error);

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Submit Application →";
        }
    });
}
