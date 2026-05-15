/* ═══════════════════════════════════════════════════════════════════
   Finance Tracker Pro — Auth Guard
   Prevents unauthenticated users from accessing the dashboard.
   Must be loaded AFTER Firebase SDK and BEFORE app.js
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  // Firebase (initialized by firebase-config.js loaded before this script)
  const auth = firebase.auth();

  const appShell = document.querySelector(".app-shell");

  // Hide app until auth state is confirmed
  if (appShell) {
    appShell.style.opacity = "0";
    appShell.style.transition = "opacity 0.4s ease";
  }

  // ── Inject Logout Button & User Info ──
  function injectUserUI(user) {
    const headerActions = document.querySelector(".header-actions");
    const mobileDropdown = document.getElementById("mobile-menu-dropdown");

    // Desktop logout button
    if (headerActions && !document.getElementById("logout-btn")) {
      const userChip = document.createElement("div");
      userChip.id = "user-chip";
      userChip.style.cssText = "display:flex;align-items:center;gap:0.5rem;";

      // Avatar: use Google photo if available, otherwise show initials
      const avatar = document.createElement("div");
      avatar.title = user.displayName || user.email;

      if (user.photoURL) {
        // Google / OAuth profile photo
        const img = document.createElement("img");
        img.src = user.photoURL;
        img.alt = user.displayName || "User";
        img.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          object-fit: cover; border: 2px solid rgba(99,102,241,0.4);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        `;
        avatar.appendChild(img);
        avatar.style.cssText = "display:flex;align-items:center;";
      } else {
        // Email/password — initials fallback
        const initial = user.displayName
          ? user.displayName.charAt(0).toUpperCase()
          : user.email.charAt(0).toUpperCase();
        avatar.textContent = initial;
        avatar.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: linear-gradient(135deg, hsl(215, 90%, 55%), #8b5cf6);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; color: #fff;
          font-family: var(--font-display);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          flex-shrink: 0;
        `;
      }

      // Friendly greeting label
      const nameLabel = document.createElement("span");
      const firstName = user.displayName
        ? user.displayName.split(" ")[0]
        : user.email.split("@")[0];
      nameLabel.textContent = firstName;
      nameLabel.style.cssText = `
        font-size: 0.8rem; font-weight: 600; color: var(--text-muted);
        max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      `;

      const logoutBtn = document.createElement("button");
      logoutBtn.id = "logout-btn";
      logoutBtn.className = "btn ghost-btn";
      logoutBtn.title = "Sign Out";
      logoutBtn.textContent = "Logout";
      logoutBtn.style.cssText = "padding: 0.5rem 0.85rem; font-size: 0.8rem;";
      logoutBtn.addEventListener("click", handleLogout);

      userChip.appendChild(avatar);
      userChip.appendChild(nameLabel);
      userChip.appendChild(logoutBtn);
      headerActions.insertBefore(userChip, headerActions.firstChild);
    }

    // Mobile menu logout item
    if (mobileDropdown && !document.getElementById("mobile-logout-item")) {
      const divider = document.createElement("div");
      divider.className = "mobile-dropdown-divider";
      divider.id = "mobile-logout-divider";

      const logoutItem = document.createElement("button");
      logoutItem.id = "mobile-logout-item";
      logoutItem.className = "mobile-dropdown-item danger";
      logoutItem.innerHTML = `
        <span class="mobile-dropdown-icon">🚪</span>
        <span>Sign Out</span>
      `;
      logoutItem.addEventListener("click", handleLogout);

      mobileDropdown.appendChild(divider);
      mobileDropdown.appendChild(logoutItem);
    }
  }

  // ── Logout Handler ──
  async function handleLogout() {
    try {
      await auth.signOut();
      window.location.replace("auth.html");
    } catch (err) {
      console.error("Logout error:", err);
      // Force redirect anyway
      window.location.replace("auth.html");
    }
  }

  // ── Auth State Observer ──
  // Exposes the current user UID globally so app.js can wait for auth
  let lastUid = null;
  let authResolved = false;

  window.__authReady = new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        const uidChanged = lastUid && lastUid !== user.uid;
        lastUid = user.uid;
        window.__currentUid = user.uid;

        // Clear previous user's UI/state before loading the new account
        if (uidChanged && typeof window.__clearUserData === "function") {
          window.__clearUserData();
        }

        injectUserUI(user);
        if (appShell) {
          appShell.style.opacity = "1";
        }
        const fabContainer = document.querySelector(".fab-container");
        if (fabContainer) fabContainer.style.opacity = "1";

        if (!authResolved) {
          authResolved = true;
          resolve(user);
        } else if (
          uidChanged &&
          typeof window.__loadUserData === "function"
        ) {
          await window.__loadUserData();
        }
      } else {
        lastUid = null;
        window.__currentUid = null;
        if (typeof window.__clearUserData === "function") {
          window.__clearUserData();
        }
        window.location.replace("auth.html");
      }
    });
  });

})();
