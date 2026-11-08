
function togglePassword(id, button) {
    const field = document.getElementById(id);

    if (field.type === "password") {
        field.type = "text";
        button.textContent = "Hide";
    } else {
        field.type = "password";
        button.textContent = "Show";
    }
}

const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const department =
            document.getElementById("department")?.value.trim() || "";

        const designation =
            document.getElementById("designation")?.value.trim() || "";

        const joining_date =
            document.getElementById("joining_date")?.value || null;

        message.style.color = "red";

        // Required field validation
        if (!name || !email || !password) {
            message.textContent =
                "Please enter your name, email and password.";
            return;
        }

        if (password.length < 8) {
            message.textContent =
                "Password must contain at least 8 characters.";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            return;
        }

        const button = registerForm.querySelector(
            'button[type="submit"]'
        );

        button.disabled = true;
        button.textContent = "Creating Account...";

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    department,
                    designation,
                    joining_date
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Registration failed."
                );
            }

            message.style.color = "green";
            message.textContent =
                "Account created successfully! Redirecting to login...";

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "/login";
            }, 1500);

        } catch (error) {
            message.style.color = "red";
            message.textContent = error.message;

            console.error("Registration Error:", error);

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}
