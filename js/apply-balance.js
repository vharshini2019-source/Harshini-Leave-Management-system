
const token = localStorage.getItem("token");
const user = JSON.parse(localStorage.getItem("user") || "null");

if (!token || !user) {
    window.location.replace("/login");
}

// Temporary display values from your leave_types table.
// These are not yet calculated from approved requests.
const leaveBalances = [
    {
        name: "casual",
        allocated: 12,
        used: 0
    },
    {
        name: "sick",
        allocated: 10,
        used: 0
    },
    {
        name: "earned",
        allocated: 15,
        used: 0
    }
];

let totalAllocated = 0;

leaveBalances.forEach(leave => {
    const remaining = leave.allocated - leave.used;
    const percentage = leave.allocated > 0
        ? (remaining / leave.allocated) * 100
        : 0;

    document.getElementById(
        `${leave.name}Remaining`
    ).textContent = remaining;

    document.getElementById(
        `${leave.name}Allocated`
    ).textContent = leave.allocated;

    document.getElementById(
        `${leave.name}Used`
    ).textContent = leave.used;

    document.getElementById(
        `${leave.name}Progress`
    ).style.width = `${percentage}%`;

    totalAllocated += leave.allocated;
});

document.getElementById("totalAllocated").textContent =
    `${totalAllocated} Days`;
