// Password protection and authentication
const ADMIN_PASSWORD = "admin123"; // This should match what's set on the server
const LOCAL_STORAGE_KEY = "adminAuth";
const passwordScreen = document.getElementById("passwordScreen");
const adminPanel = document.getElementById("adminPanel");
const adminPassword = document.getElementById("adminPassword");
const submitPassword = document.getElementById("submitPassword");
const passwordError = document.getElementById("passwordError");
const logoutBtn = document.getElementById("logoutBtn");

// Check if already authenticated
function checkAuthentication() {
  const savedAuth = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedAuth === ADMIN_PASSWORD) {
    showAdminPanel();
  } else {
    showPasswordScreen();
  }
}

function showAdminPanel() {
  passwordScreen.style.display = "none";
  adminPanel.style.display = "block";
  loadTokens();
  loadMocks();
  loadConversations();

  // Set up the event listener for the Refresh All button
  document
    .getElementById("refreshAllTokens")
    .addEventListener("click", refreshAllTokens);
}

function showPasswordScreen() {
  passwordScreen.style.display = "flex";
  adminPanel.style.display = "none";
  adminPassword.value = "";
}

submitPassword.addEventListener("click", () => {
  const password = adminPassword.value.trim();
  if (password === ADMIN_PASSWORD) {
    localStorage.setItem(LOCAL_STORAGE_KEY, password);
    showAdminPanel();
    passwordError.style.display = "none";
  } else {
    passwordError.textContent = "Invalid password. Please try again.";
    passwordError.style.display = "block";
  }
});

// Allow pressing Enter in the password field to submit
adminPassword.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    submitPassword.click();
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  showPasswordScreen();
});

// Tab switching
const tabLinks = document.querySelectorAll(".tab-link");
const tabContents = document.querySelectorAll(".tab-content");

tabLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const tabName = link.getAttribute("data-tab");

    // Remove active class from all tabs
    tabLinks.forEach((tab) => tab.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    // Add active class to current tab
    link.classList.add("active");
    document.getElementById(tabName).classList.add("active");
  });
});

// Token management
async function loadTokens() {
  try {
    const response = await fetch("/tokens", {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load tokens");
    }

    const tokens = await response.json();
    renderTokens(tokens);
  } catch (error) {
    console.error("Error loading tokens:", error);
    document.getElementById(
      "tokensContainer"
    ).innerHTML = `<p class="error">Error loading tokens: ${error.message}</p>`;
  }
}

// Function to refresh all tokens
async function refreshAllTokens() {
  try {
    const refreshButton = document.getElementById("refreshAllTokens");
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";

    const response = await fetch("/tokens", {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load tokens");
    }

    const tokens = await response.json();
    const userIds = Object.keys(tokens);

    // If no tokens, no need to continue
    if (userIds.length === 0) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh All";
      return;
    }

    // Create a status message element
    const tokensContainer = document.getElementById("tokensContainer");
    const statusElement = document.createElement("div");
    statusElement.className = "refresh-status";
    statusElement.textContent = "Refreshing tokens: 0/" + userIds.length;
    tokensContainer.prepend(statusElement);

    // Refresh each token one by one
    let completedCount = 0;
    for (const userId of userIds) {
      try {
        await fetch(`/auth/refresh/${userId}`, {
          headers: {
            "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
          },
        });
        completedCount++;
        statusElement.textContent = `Refreshing tokens: ${completedCount}/${userIds.length}`;
      } catch (error) {
        console.error(`Error refreshing token for user ${userId}:`, error);
      }
    }

    // Reload the tokens display when done
    await loadTokens();
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh All";
  } catch (error) {
    console.error("Error refreshing all tokens:", error);
    alert(`Error refreshing all tokens: ${error.message}`);

    const refreshButton = document.getElementById("refreshAllTokens");
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh All";
  }
}

function renderTokens(tokens) {
  const tokensContainer = document.getElementById("tokensContainer");

  if (!tokens || Object.keys(tokens).length === 0) {
    tokensContainer.innerHTML = "<p>No authenticated users found.</p>";
    return;
  }

  let html = `
        <table class="token-table">
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>User Principal</th>
                    <th>Expires At</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

  const now = new Date();

  for (const userId in tokens) {
    const user = tokens[userId];

    // Calculate expiry time by adding expiresIn seconds to the timestamp
    let timestampDate, expiryDate;

    if (user.timestamp) {
      // Use timestamp if available
      timestampDate = new Date(user.timestamp);
      expiryDate = new Date(timestampDate.getTime() + user.expiresIn * 1000);
    } else if (user.expiresAt) {
      // Fallback to expiresAt if present
      expiryDate = new Date(user.expiresAt);
    } else {
      // Last resort - show as expired
      expiryDate = new Date(0);
    }

    const isExpired = expiryDate < now;

    // Format time remaining or elapsed
    let timeText = "";
    const timeDiffMs = Math.abs(expiryDate.getTime() - now.getTime());
    const days = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((timeDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiffMs % (1000 * 60)) / 1000);

    if (days > 0) {
      timeText = `${days} day${days > 1 ? "s" : ""} ${hours} hr${
        hours > 1 ? "s" : ""
      }`;
    } else if (hours > 0) {
      timeText = `${hours} hr${hours > 1 ? "s" : ""} ${minutes} min${
        minutes > 1 ? "s" : ""
      }`;
    } else if (minutes > 0) {
      timeText = `${minutes} minute${minutes > 1 ? "s" : ""} ${seconds} sec${
        seconds > 1 ? "s" : ""
      }`;
    } else {
      timeText = `${seconds} second${seconds > 1 ? "s" : ""}`;
    }

    if (isExpired) {
      timeText = `Expired ${timeText} ago`;
    } else {
      timeText = `Expires in ${timeText}`;
    }

    html += `
            <tr${isExpired ? ' style="color: #d32f2f;"' : ""}>
                <td>${user.userId || userId}</td>
                <td>${user.userPrincipalName || "N/A"}</td>
                <td>
                    <div>${expiryDate.toLocaleString()}</div>
                    <div style="font-size: 0.8em; font-style: italic;">${timeText}</div>
                </td>
                <td class="token-actions">
                    <button class="refresh-token" data-userid="${userId}"${
      isExpired ? "" : ' style="opacity: 0.6;"'
    }>Refresh Token</button>
                </td>
            </tr>
        `;
  }

  html += `
            </tbody>
        </table>
    `;

  tokensContainer.innerHTML = html;

  // Add refresh token event listeners
  document.querySelectorAll(".refresh-token").forEach((button) => {
    button.addEventListener("click", async () => {
      const userId = button.getAttribute("data-userid");
      await refreshToken(userId);
    });
  });
}

async function refreshToken(userId) {
  try {
    const button = document.querySelector(
      `.refresh-token[data-userid="${userId}"]`
    );
    button.disabled = true;
    button.textContent = "Refreshing...";

    const response = await fetch(`/auth/refresh/${userId}`, {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    // Reload tokens after refresh
    await loadTokens();
  } catch (error) {
    console.error("Error refreshing token:", error);
    alert(`Error refreshing token: ${error.message}`);
  }
}

// Mock data management
let selectedMock = null;
const seedButton = document.getElementById("seedButton");
const conversationIdInput = document.getElementById("conversationId");
const seedStatus = document.getElementById("seedStatus");
const mocksList = document.getElementById("mocksList");
const mockPreview = document.getElementById("mockPreview");
const mockPreviewContainer = document.querySelector(".mock-preview");

async function loadMocks() {
  try {
    const response = await fetch("/mocks", {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load mocks");
    }

    const mocks = await response.json();
    renderMocks(mocks);
  } catch (error) {
    console.error("Error loading mocks:", error);
    mocksList.innerHTML = `<p class="error">Error loading mocks: ${error.message}</p>`;
  }
}

function renderMocks(mocks) {
  if (!mocks || mocks.length === 0) {
    mocksList.innerHTML = "<p>No mock data available.</p>";
    return;
  }

  let html = "";
  mocks.forEach((mock) => {
    html += `
            <div class="mock-card" data-mock="${mock.path}" data-folder="${mock.folder}">
                <h3>${mock.name}</h3>
                <p>${mock.messageCount} messages</p>
                <p class="mock-folder" style="font-size: 0.8em; color: #666; margin-top: 0.5em;">Source: ${mock.folder}</p>
            </div>
        `;
  });

  mocksList.innerHTML = html;

  // Add click event listeners to mock cards
  document.querySelectorAll(".mock-card").forEach((card) => {
    card.addEventListener("click", () => {
      // Remove selected class from all cards
      document
        .querySelectorAll(".mock-card")
        .forEach((c) => c.classList.remove("selected"));

      // Add selected class to clicked card
      card.classList.add("selected");

      // Store selected mock
      selectedMock = {
        path: card.getAttribute("data-mock"),
        folder: card.getAttribute("data-folder"),
      };

      // Load mock preview
      loadMockPreview(selectedMock);

      // Enable seed button if conversation ID is provided
      seedButton.disabled = !conversationIdInput.value.trim();
    });
  });
}

async function loadMockPreview(mockInfo) {
  if (!mockInfo || !mockInfo.path || !mockInfo.folder) return;

  // Show loading state
  mockPreviewContainer.style.display = "block";
  mockPreview.innerHTML =
    '<div class="preview-loading">Loading preview...</div>';

  try {
    const response = await fetch(
      `/mock-preview/${encodeURIComponent(
        mockInfo.folder
      )}/${encodeURIComponent(mockInfo.path)}`,
      {
        headers: {
          "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load mock preview");
    }

    const mockData = await response.json();

    if (!Array.isArray(mockData) || mockData.length === 0) {
      mockPreview.innerHTML = "<p>No messages in this mock data.</p>";
      return;
    }

    // Helper function to escape HTML
    function escapeHtml(unsafe) {
      if (typeof unsafe !== "string") return "";
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Render messages preview (up to 10 messages)
    const messagesToShow = mockData.slice(0, 10);
    let html = `
            <div class="preview-header">
                <p class="preview-title">Mock Data Preview</p>
                <p class="preview-count">${mockData.length} total messages</p>
            </div>
        `;

    messagesToShow.forEach((message, index) => {
      // Determine the message field based on the data structure
      let messageContent = "";
      if (typeof message.content === "string") {
        messageContent = message.content;
      } else if (typeof message.text === "string") {
        messageContent = message.text;
      } else if (message.message && typeof message.message === "string") {
        messageContent = message.message;
      } else {
        messageContent = "No readable content";
      }

      // Get sender information
      const sender = escapeHtml(
        message.sender ||
          message.from ||
          message.author ||
          message.userId ||
          "Unknown"
      );

      // Format date
      const date = new Date(
        message.timestamp || message.created_at || message.date || Date.now()
      ).toLocaleString();

      html += `
                <div class="message-preview">
                    <div class="message-author">${sender}</div>
                    <div class="message-time">${date}</div>
                    <div class="message-content">${escapeHtml(
                      messageContent
                    )}</div>
                </div>
            `;
    });

    if (mockData.length > 10) {
      html += `<div style="text-align: center; font-style: italic; margin-top: 1rem;">...and ${
        mockData.length - 10
      } more messages</div>`;
    }

    mockPreview.innerHTML = html;
  } catch (error) {
    console.error("Error loading mock preview:", error);
    mockPreview.innerHTML = `<p class="error">Error loading preview: ${error.message}</p>`;
  }
}

// Enable/disable seed button based on conversation ID input
conversationIdInput.addEventListener("input", () => {
  seedButton.disabled = !(
    conversationIdInput.value.trim() &&
    selectedMock &&
    selectedMock.path
  );
});

seedButton.addEventListener("click", async () => {
  const conversationId = conversationIdInput.value.trim();

  if (
    !conversationId ||
    !selectedMock ||
    !selectedMock.path ||
    !selectedMock.folder
  ) {
    seedStatus.textContent =
      "Please provide a conversation ID and select a mock.";
    seedStatus.className = "error";
    return;
  }

  try {
    seedButton.disabled = true;
    seedButton.textContent = "Seeding...";
    seedStatus.textContent = "Seeding conversation...";
    seedStatus.className = "";

    console.log("Seeding conversation with ID:", conversationId);
    const response = await fetch("/seed/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
      body: JSON.stringify({
        conversationId,
        folder: selectedMock.folder,
        mockFile: selectedMock.path,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to seed conversation");
    }

    const result = await response.json();
    seedStatus.textContent = result.message;
    seedStatus.className = "success";
  } catch (error) {
    console.error("Error seeding conversation:", error);
    seedStatus.textContent = `Error: ${error.message}`;
    seedStatus.className = "error";
  } finally {
    seedButton.disabled = false;
    seedButton.textContent = "Seed Selected Mock";
  }
});

// Conversations management
const conversationsContainer = document.getElementById(
  "conversationsContainer"
);
const refreshConversationsBtn = document.getElementById("refreshConversations");
const fetchGraphConversationsBtn = document.getElementById(
  "fetchGraphConversations"
);

refreshConversationsBtn.addEventListener("click", () => {
  loadConversations();
});

fetchGraphConversationsBtn.addEventListener("click", () => {
  fetchGraphConversations();
});

async function loadConversations() {
  try {
    conversationsContainer.innerHTML = "<p>Loading conversations...</p>";

    // First, load tokens to check which users we have access tokens for
    let userTokens = {};
    try {
      const tokensResponse = await fetch("/tokens", {
        headers: {
          "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
        },
      });

      if (tokensResponse.ok) {
        userTokens = await tokensResponse.json();
      }
    } catch (error) {
      console.error("Error loading tokens for member highlighting:", error);
    }

    const response = await fetch("/conversations", {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load conversations");
    }

    const conversations = await response.json();
    renderConversations(conversations, userTokens);
  } catch (error) {
    console.error("Error loading conversations:", error);
    conversationsContainer.innerHTML = `<p class="error">Error loading conversations: ${error.message}</p>`;
  }
}

function renderConversations(conversations, userTokens = {}) {
  if (!conversations || Object.keys(conversations).length === 0) {
    conversationsContainer.innerHTML = `
            <div class="empty-state">
                <p>No active conversations found.</p>
                <p>Create a conversation in Microsoft Teams or seed mock data to create one.</p>
            </div>
        `;
    return;
  }

  let html = "<h3>Local Conversations</h3>";

  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Get array of userIds we have tokens for
  const tokenUserIds = Object.keys(userTokens);

  conversations.forEach((conversation) => {
    const date = new Date(
      conversation.createdDateTime ||
        conversation.lastUpdatedDateTime ||
        Date.now()
    ).toLocaleString();

    // Build members list
    let membersHtml = "";
    if (conversation.members && conversation.members.length) {
      membersHtml = '<div class="conversation-members">';
      membersHtml +=
        '<h4 style="margin-top: 0; margin-bottom: 0.5rem;">Members</h4>';
      membersHtml += '<div class="member-list">';

      conversation.members.forEach((member) => {
        const memberName =
          member.displayName ||
          member.userPrincipalName ||
          member.email ||
          member.userId ||
          "Unknown User";
        const hasToken = tokenUserIds.includes(member.userId);
        const tokenClass = hasToken ? "has-token" : "";
        membersHtml += `<span class="member-badge ${tokenClass}" title="${
          hasToken ? "User has active token" : ""
        }">${escapeHtml(memberName)}</span>`;
      });

      membersHtml += "</div></div>";
    }

    // Build conversation card
    html += `
            <div class="conversation-card" data-id="${conversation.id}">
                <div class="conversation-header">
                    <h3 class="conversation-title">${
                      conversation.topic || "Untitled Conversation"
                    }</h3>
                    <span class="conversation-date">${date}</span>
                </div>
                <div>
                    <strong>ID:</strong> <code>${conversation.id}</code>
                </div>
                ${membersHtml}
                <div class="conversation-actions">
                    <button class="copy-id" data-id="${
                      conversation.id
                    }">Copy ID</button>
                    <button class="seed-to-conversation" data-id="${
                      conversation.id
                    }">Seed Mock Data</button>
                </div>
            </div>
        `;
  });

  conversationsContainer.innerHTML = html;

  // Add event listeners for copy ID buttons
  document.querySelectorAll(".copy-id").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      navigator.clipboard
        .writeText(id)
        .then(() => {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy ID to clipboard");
        });
    });
  });

  // Add event listeners for seed mock data buttons
  document.querySelectorAll(".seed-to-conversation").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      // Switch to mocks tab and fill in the conversation ID
      document.querySelector('.tab-link[data-tab="mocks"]').click();
      conversationIdInput.value = id;
      // Enable seed button if a mock is selected
      seedButton.disabled = !(selectedMock && selectedMock.path);
      // Scroll to the seed section
      document
        .querySelector(".form-group h3")
        .scrollIntoView({ behavior: "smooth" });
    });
  });
}

async function fetchGraphConversations() {
  try {
    conversationsContainer.innerHTML =
      "<p>Fetching conversations from Microsoft Graph...</p>";

    // First, load tokens to check which users we have access tokens for
    let userTokens = {};
    try {
      const tokensResponse = await fetch("/tokens", {
        headers: {
          "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
        },
      });

      if (tokensResponse.ok) {
        userTokens = await tokensResponse.json();
      }
    } catch (error) {
      console.error("Error loading tokens for member highlighting:", error);
    }

    const response = await fetch("/conversations/graph", {
      headers: {
        "Admin-Auth": localStorage.getItem(LOCAL_STORAGE_KEY),
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch conversations from Microsoft Graph");
    }

    const userChats = await response.json();
    renderGraphConversations(userChats, userTokens);
  } catch (error) {
    console.error("Error fetching conversations from Microsoft Graph:", error);
    conversationsContainer.innerHTML = `<p class="error">Error fetching conversations from Microsoft Graph: ${error.message}</p>`;
  }
}

function renderGraphConversations(userChats, userTokens = {}) {
  if (!userChats || Object.keys(userChats).length === 0) {
    conversationsContainer.innerHTML = `
            <div class="empty-state">
                <p>No conversations found from Microsoft Graph.</p>
                <p>Users may not have any active chats or may need to authenticate first.</p>
            </div>
        `;
    return;
  }

  let html = "<h3>Microsoft Graph Conversations</h3>";

  // Helper function to escape HTML
  function escapeHtml(unsafe) {
    if (typeof unsafe !== "string") return "";
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Get array of userIds we have tokens for
  const tokenUserIds = Object.keys(userTokens);

  // Loop through each user's conversations
  for (const userId in userChats) {
    const chats = userChats[userId];

    if (chats.length === 0) {
      continue;
    }

    // Get user info from one of their chats
    const userInfo = chats[0].members.find((m) => m.userId === userId);
    const userName = userInfo
      ? userInfo.displayName || userInfo.userPrincipalName || userId
      : userId;

    // Check if this user has a token (they should, as we're using their token to fetch)
    const hasUserToken = tokenUserIds.includes(userId);
    const userTokenClass = hasUserToken ? "has-token" : "";

    html += `
            <div class="user-section" style="margin-bottom: 1.5rem; border-bottom: 1px solid #eee; padding-bottom: 1rem;">
                <h4 style="margin-bottom: 0.5rem;">
                    <span class="member-badge ${userTokenClass}" title="${
      hasUserToken ? "User has active token" : ""
    }">${escapeHtml(userName)}</span>'s Conversations
                </h4>
        `;

    // Render each chat for this user
    chats.forEach((chat) => {
      const date = new Date(
        chat.createdDateTime || chat.lastUpdatedDateTime || Date.now()
      ).toLocaleString();

      // Build members list
      let membersHtml = "";
      if (chat.members && chat.members.length) {
        membersHtml = '<div class="conversation-members">';
        membersHtml +=
          '<h4 style="margin-top: 0; margin-bottom: 0.5rem;">Members</h4>';
        membersHtml += '<div class="member-list">';

        chat.members.forEach((member) => {
          const memberName =
            member.displayName ||
            member.userPrincipalName ||
            member.email ||
            member.userId ||
            "Unknown User";
          const hasToken = tokenUserIds.includes(member.userId);
          const tokenClass = hasToken ? "has-token" : "";
          membersHtml += `<span class="member-badge ${tokenClass}" title="${
            hasToken ? "User has active token" : ""
          }">${escapeHtml(memberName)}</span>`;
        });

        membersHtml += "</div></div>";
      }

      // Build chat card
      html += `
                <div class="conversation-card" data-id="${chat.id}">
                    <div class="conversation-header">
                        <h3 class="conversation-title">${
                          chat.topic || chat.chatType || "Untitled Conversation"
                        }</h3>
                        <span class="conversation-date">${date}</span>
                    </div>
                    <div>
                        <strong>ID:</strong> <code>${chat.id}</code>
                    </div>
                    <div>
                        <strong>Type:</strong> ${chat.chatType || "Unknown"}
                    </div>
                    ${membersHtml}
                    <div class="conversation-actions">
                        <button class="copy-id" data-id="${
                          chat.id
                        }">Copy ID</button>
                        <button class="seed-to-conversation" data-id="${
                          chat.id
                        }">Seed Mock Data</button>
                    </div>
                </div>
            `;
    });

    html += "</div>"; // Close user-section
  }

  conversationsContainer.innerHTML = html;

  // Add event listeners for copy ID buttons
  document.querySelectorAll(".copy-id").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      navigator.clipboard
        .writeText(id)
        .then(() => {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          setTimeout(() => {
            button.textContent = originalText;
          }, 2000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy ID to clipboard");
        });
    });
  });

  // Add event listeners for seed mock data buttons
  document.querySelectorAll(".seed-to-conversation").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-id");
      // Switch to mocks tab and fill in the conversation ID
      document.querySelector('.tab-link[data-tab="mocks"]').click();
      conversationIdInput.value = id;
      // Enable seed button if a mock is selected
      seedButton.disabled = !(selectedMock && selectedMock.path);
      // Scroll to the seed section
      document
        .querySelector(".form-group h3")
        .scrollIntoView({ behavior: "smooth" });
    });
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", checkAuthentication);
