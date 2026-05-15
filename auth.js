/* ═══════════════════════════════════════════════════════════════════
   Finance Tracker Pro — Authentication Logic (Firebase)
   Handles login, signup, Google sign-in, forgot password, sessions
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  "use strict";

  // ── Firebase (initialized by firebase-config.js) ──
  const auth = firebase.auth();

  // ── DOM Elements ──
  const $ = (id) => document.getElementById(id);

  const els = {
    // Tabs
    tabLogin: $("tab-login"),
    tabSignup: $("tab-signup"),
    // Forms
    loginForm: $("login-form"),
    signupForm: $("signup-form"),
    // Login fields
    loginEmail: $("login-email"),
    loginPassword: $("login-password"),
    loginEmailError: $("login-email-error"),
    loginPasswordError: $("login-password-error"),
    loginSubmitBtn: $("login-submit-btn"),
    rememberMe: $("remember-me"),
    // Signup fields
    signupName: $("signup-name"),
    signupEmail: $("signup-email"),
    signupPassword: $("signup-password"),
    signupConfirm: $("signup-confirm"),
    signupNameError: $("signup-name-error"),
    signupEmailError: $("signup-email-error"),
    signupPasswordError: $("signup-password-error"),
    signupConfirmError: $("signup-confirm-error"),
    signupSubmitBtn: $("signup-submit-btn"),
    // Password strength
    strBars: [$("str-bar-1"), $("str-bar-2"), $("str-bar-3"), $("str-bar-4")],
    strengthLabel: $("strength-label"),
    // Google buttons
    googleLoginBtn: $("google-login-btn"),
    googleSignupBtn: $("google-signup-btn"),
    // Global messages
    globalError: $("auth-global-error"),
    errorText: $("auth-error-text"),
    successMsg: $("auth-success-msg"),
    successText: $("auth-success-text"),
    // Forgot password
    forgotBtn: $("forgot-password-btn"),
    forgotOverlay: $("forgot-modal-overlay"),
    forgotEmail: $("forgot-email"),
    forgotSubmitBtn: $("forgot-submit-btn"),
    forgotCancelBtn: $("forgot-cancel-btn"),
    forgotError: $("forgot-error"),
    forgotErrorText: $("forgot-error-text"),
    forgotSuccess: $("forgot-success"),
    forgotSuccessText: $("forgot-success-text"),
    // Theme
    themeToggle: $("auth-theme-toggle"),
    themeIcon: $("auth-theme-icon"),
  };

  // ── Theme Management ──
  const THEME_KEY = "finance_tracker_theme_v1";

  function loadTheme() {
    return localStorage.getItem(THEME_KEY) || "dark";
  }

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    els.themeIcon.textContent = theme === "dark" ? "🌙" : "🔆";
    localStorage.setItem(THEME_KEY, theme);
  }

  applyTheme(loadTheme());

  els.themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  // ── Tab Switching ──
  function switchTab(tab) {
    clearAllErrors();
    hideGlobalMessages();

    if (tab === "login") {
      els.tabLogin.classList.add("active");
      els.tabSignup.classList.remove("active");
      els.loginForm.classList.add("active");
      els.signupForm.classList.remove("active");
    } else {
      els.tabSignup.classList.add("active");
      els.tabLogin.classList.remove("active");
      els.signupForm.classList.add("active");
      els.loginForm.classList.remove("active");
    }
  }

  els.tabLogin.addEventListener("click", () => switchTab("login"));
  els.tabSignup.addEventListener("click", () => switchTab("signup"));

  // ── Validation Helpers ──
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0-4
  }

  function setFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add("error");
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(inputEl, errorEl) {
    if (inputEl) inputEl.classList.remove("error");
    if (errorEl) errorEl.textContent = "";
  }

  function clearAllErrors() {
    const inputs = document.querySelectorAll(".auth-input-wrap input");
    const errors = document.querySelectorAll(".input-error-msg");
    inputs.forEach((i) => i.classList.remove("error"));
    errors.forEach((e) => (e.textContent = ""));
  }

  function showGlobalError(message) {
    els.errorText.textContent = message;
    els.globalError.classList.add("show");
    els.successMsg.classList.remove("show");
  }

  function showGlobalSuccess(message) {
    els.successText.textContent = message;
    els.successMsg.classList.add("show");
    els.globalError.classList.remove("show");
  }

  function hideGlobalMessages() {
    els.globalError.classList.remove("show");
    els.successMsg.classList.remove("show");
  }

  function setButtonLoading(btn, loading) {
    if (loading) {
      btn.classList.add("loading");
      btn.disabled = true;
    } else {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  // ── Firebase Error Messages ──
  function friendlyError(code) {
    const map = {
      "auth/user-not-found": "No account found with this email address.",
      "auth/wrong-password": "Incorrect password. Please try again.",
      "auth/invalid-credential": "Invalid email or password. Please try again.",
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/weak-password": "Password is too weak. Use at least 6 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
      "auth/network-request-failed": "Network error. Please check your connection.",
      "auth/popup-closed-by-user": "Sign-in popup was closed. Please try again.",
      "auth/popup-blocked": "Popup was blocked by your browser. Allow popups and try again.",
      "auth/account-exists-with-different-credential": "An account already exists with a different sign-in method.",
      "auth/operation-not-allowed": "This sign-in method is not enabled. Please enable it in Firebase Console.",
      "auth/requires-recent-login": "Please sign in again to complete this action.",
      "auth/unauthorized-domain": "This domain is not authorized for Firebase. Add it in Authentication > Settings.",
      "auth/invalid-api-key": "Invalid Firebase API key. Please check your configuration.",
      "auth/configuration-not-found": "Firebase configuration not found. Check your settings.",
    };
    
    if (map[code]) return map[code];
    return `An unexpected error occurred (${code || 'unknown'}). Please try again.`;
  }

  // ── Password Strength Indicator ──
  function updatePasswordStrength(password) {
    const score = getPasswordStrength(password);
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const classes = ["", "weak", "medium", "medium", "strong"];

    els.strBars.forEach((bar, i) => {
      bar.className = "strength-bar";
      if (i < score) {
        bar.classList.add(classes[score]);
      }
    });

    els.strengthLabel.textContent = password.length > 0 ? labels[score] : "";
  }

  els.signupPassword.addEventListener("input", () => {
    updatePasswordStrength(els.signupPassword.value);
  });

  // ── Toggle Password Visibility ──
  document.querySelectorAll(".toggle-password").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      // Switch icon
      btn.innerHTML = isPassword
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
             <line x1="1" y1="1" x2="23" y2="23"></line>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
             <circle cx="12" cy="12" r="3"></circle>
           </svg>`;
    });
  });

  // ── Login Form Submission ──
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();
    hideGlobalMessages();

    const email = els.loginEmail.value.trim();
    const password = els.loginPassword.value;
    let valid = true;

    if (!email) {
      setFieldError(els.loginEmail, els.loginEmailError, "Email is required.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(els.loginEmail, els.loginEmailError, "Enter a valid email.");
      valid = false;
    }

    if (!password) {
      setFieldError(els.loginPassword, els.loginPasswordError, "Password is required.");
      valid = false;
    }

    if (!valid) return;

    // Set persistence based on Remember Me
    const persistence = els.rememberMe.checked
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    setButtonLoading(els.loginSubmitBtn, true);

    try {
      await auth.setPersistence(persistence);
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will handle redirect
    } catch (err) {
      console.error("Login Error:", err);
      showGlobalError(friendlyError(err.code));
      setButtonLoading(els.loginSubmitBtn, false);
    }
  });

  // ── Signup Form Submission ──
  els.signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors();
    hideGlobalMessages();

    const name = els.signupName.value.trim();
    const email = els.signupEmail.value.trim();
    const password = els.signupPassword.value;
    const confirm = els.signupConfirm.value;
    let valid = true;

    if (!name) {
      setFieldError(els.signupName, els.signupNameError, "Name is required.");
      valid = false;
    }

    if (!email) {
      setFieldError(els.signupEmail, els.signupEmailError, "Email is required.");
      valid = false;
    } else if (!isValidEmail(email)) {
      setFieldError(els.signupEmail, els.signupEmailError, "Enter a valid email.");
      valid = false;
    }

    if (!password) {
      setFieldError(els.signupPassword, els.signupPasswordError, "Password is required.");
      valid = false;
    } else if (password.length < 6) {
      setFieldError(els.signupPassword, els.signupPasswordError, "Password must be at least 6 characters.");
      valid = false;
    }

    if (password !== confirm) {
      setFieldError(els.signupConfirm, els.signupConfirmError, "Passwords do not match.");
      valid = false;
    }

    if (!valid) return;

    setButtonLoading(els.signupSubmitBtn, true);

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const credential = await auth.createUserWithEmailAndPassword(email, password);
      // Update display name
      await credential.user.updateProfile({ displayName: name });
      // onAuthStateChanged will handle redirect
    } catch (err) {
      console.error("Signup Error:", err);
      showGlobalError(friendlyError(err.code));
      setButtonLoading(els.signupSubmitBtn, false);
    }
  });

  // ── Google Sign-In ──
  async function signInWithGoogle(e) {
    if (e) e.preventDefault();
    hideGlobalMessages();
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      // Set persistence first
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      
      // Try popup first (better UX on desktop)
      try {
        await auth.signInWithPopup(provider);
      } catch (popupErr) {
        // If popup is blocked or fails, fall back to redirect
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/cancelled-popup-request') {
          await auth.signInWithRedirect(provider);
        } else {
          throw popupErr;
        }
      }
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google Auth Error:", err);
        showGlobalError(friendlyError(err.code));
      }
    }
  }

  // Safety check: only add listeners if elements exist
  if (els.googleLoginBtn) {
    els.googleLoginBtn.addEventListener("click", signInWithGoogle);
  }
  if (els.googleSignupBtn) {
    els.googleSignupBtn.addEventListener("click", signInWithGoogle);
  }

  // Handle redirect result (in case fallback was used)
  auth.getRedirectResult().catch((err) => {
    if (err.code && err.code !== 'auth/popup-closed-by-user') {
      showGlobalError(friendlyError(err.code));
    }
  });

  // ── Forgot Password ──
  els.forgotBtn.addEventListener("click", () => {
    els.forgotOverlay.classList.add("show");
    els.forgotEmail.value = els.loginEmail.value.trim();
    els.forgotError.classList.remove("show");
    els.forgotSuccess.classList.remove("show");
    setTimeout(() => els.forgotEmail.focus(), 100);
  });

  els.forgotCancelBtn.addEventListener("click", () => {
    els.forgotOverlay.classList.remove("show");
  });

  els.forgotOverlay.addEventListener("click", (e) => {
    if (e.target === els.forgotOverlay) {
      els.forgotOverlay.classList.remove("show");
    }
  });

  els.forgotSubmitBtn.addEventListener("click", async () => {
    const email = els.forgotEmail.value.trim();
    els.forgotError.classList.remove("show");
    els.forgotSuccess.classList.remove("show");

    if (!email || !isValidEmail(email)) {
      els.forgotErrorText.textContent = "Please enter a valid email address.";
      els.forgotError.classList.add("show");
      return;
    }

    setButtonLoading(els.forgotSubmitBtn, true);

    try {
      await auth.sendPasswordResetEmail(email);
      els.forgotSuccessText.textContent = "Password reset link sent! Check your inbox.";
      els.forgotSuccess.classList.add("show");
      setTimeout(() => {
        els.forgotOverlay.classList.remove("show");
      }, 3000);
    } catch (err) {
      console.error("Forgot Password Error:", err);
      els.forgotErrorText.textContent = friendlyError(err.code);
      els.forgotError.classList.add("show");
    } finally {
      setButtonLoading(els.forgotSubmitBtn, false);
    }
  });

  // ── Auth State Observer ──
  auth.onAuthStateChanged((user) => {
    if (user) {
      // User is signed in — redirect to dashboard
      window.location.replace("index.html");
    }
  });

  // ── Clear errors on input ──
  document.querySelectorAll(".auth-input-wrap input").forEach((input) => {
    input.addEventListener("input", () => {
      input.classList.remove("error");
      const errorEl = input.closest(".auth-input-group")?.querySelector(".input-error-msg");
      if (errorEl) errorEl.textContent = "";
      hideGlobalMessages();
    });
  });

  // ── Keyboard: Enter to submit ──
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.forgotOverlay.classList.contains("show")) {
      els.forgotOverlay.classList.remove("show");
    }
  });

})();
