document.addEventListener("DOMContentLoaded", async () => {
  const authButton = document.getElementById("authButton");
  const statusElement = document.getElementById("status");
  const successMessage = document.getElementById("successMessage");
  const errorMessage = document.getElementById("errorMessage");
  const authContent = document.getElementById("authContent");

  // Check URL parameters for success or error messages
  const urlParams = new URLSearchParams(window.location.search);
  const error = urlParams.get("error");
  const success = urlParams.get("success");
  const user = urlParams.get("user");

  if (error) {
    // Display error message
    errorMessage.textContent = `Error: ${error}`;
    errorMessage.classList.remove("hidden");
  }

  if (success === "true" && user) {
    // Display success message and hide auth content
    successMessage.textContent = `Authentication successful! Welcome, ${user}.`;
    successMessage.classList.remove("hidden");
    authContent.classList.add("hidden");

    // If you want to redirect after successful auth:
    // setTimeout(() => { window.location.href = '/some-other-page'; }, 3000);
    return;
  }

  try {
    // Fetch the authentication URL from the API
    const response = await fetch("/auth/url");
    const data = await response.json();

    if (data.authUrl) {
      // Enable the button and update text
      authButton.disabled = false;
      authButton.textContent = "Sign in with Microsoft";
      statusElement.textContent = "Ready to authenticate";

      // Add click event listener to redirect to auth URL
      authButton.addEventListener("click", () => {
        window.location.href = data.authUrl;
      });
    } else {
      statusElement.textContent = "Error: Authentication URL not received";
    }
  } catch (error) {
    console.error("Failed to fetch auth URL:", error);
    statusElement.textContent =
      "Error: Failed to connect to authentication service";
  }
});
