(() => {
  "use strict";

  const STORAGE_KEYS = {
    THEME: "finance_tracker_theme_v1",
    BUDGETS: "finance_tracker_budgets_v1",
    RECURRING: "finance_tracker_recurring_v1",
    ALERTS: "finance_tracker_alerts_v1",
    CURRENCY: "finance_tracker_currency_v1",
  };

  const ACCOUNT_IDS = ["cash", "upi", "bank", "card"];

  const userStorageKey = (baseKey) => {
    const uid = firebase.auth().currentUser?.uid || window.__currentUid || null;
    if (!uid) return baseKey; // Fallback if not logged in
    return `${baseKey}_${uid}`;
  };

  const CATEGORY_META = {
    food: { icon: "\uD83C\uDF54", color: "#ff9f43" },
    travel: { icon: "\u2708\uFE0F", color: "#54a0ff" },
    gaming: { icon: "\uD83C\uDFAE", color: "#5f27cd" },
    bills: { icon: "\uD83D\uDCA1", color: "#ff6b6b" },
    shopping: { icon: "\uD83D\uDECD\uFE0F", color: "#48dbfb" },
    others: { icon: "\uD83D\uDCE6", color: "#a29bfe" },
  };

  /** Integer paise math — no parseFloat; strings parsed digit-by-digit. */
  const Money = {
    decimalStringToCents(str) {
      const s = String(str).trim().replace(/,/g, "");
      if (!s) return NaN;
      const neg = s.startsWith("-");
      const body = neg ? s.slice(1) : s;
      const m = body.match(/^(\d+)(?:\.(\d+))?$/);
      if (!m) return NaN;
      let rupees = parseInt(m[1], 10);
      const frac = m[2] || "";
      let paise = 0;
      if (frac.length > 0) {
        const d1 = frac[0] || "0";
        const d2 = frac[1] || "0";
        const d3 = frac[2] || "0";
        paise = parseInt(d1, 10) * 10 + parseInt(d2, 10);
        if (parseInt(d3, 10) >= 5) paise += 1;
        if (paise >= 100) {
          rupees += 1;
          paise = 0;
        }
      }
      const total = rupees * 100 + paise;
      return neg ? -total : total;
    },
    toCents(amount) {
      if (amount === "" || amount == null) return 0;
      if (typeof amount === "string") {
        const c = Money.decimalStringToCents(amount);
        return Number.isFinite(c) ? c : 0;
      }
      const n = Number(amount);
      if (!Number.isFinite(n)) return 0;
      const c = Money.decimalStringToCents(n.toFixed(2));
      return Number.isFinite(c) ? c : 0;
    },
    fromCents(cents) {
      return cents / 100;
    },
    round(amount) {
      return Money.fromCents(Money.toCents(amount));
    },
    parse(value) {
      if (value === "" || value == null) return NaN;
      if (typeof value === "string") {
        const c = Money.decimalStringToCents(value);
        return Number.isFinite(c) ? Money.fromCents(c) : NaN;
      }
      const n = Number(value);
      if (!Number.isFinite(n)) return NaN;
      return Money.fromCents(Money.toCents(n));
    },
    sum(amounts) {
      let cents = 0;
      for (const a of amounts) cents += Money.toCents(a);
      return Money.fromCents(cents);
    },
    subtract(a, b) {
      return Money.fromCents(Money.toCents(a) - Money.toCents(b));
    },
    normalizeTransaction(tx) {
      if (!tx) return tx;
      const id = tx.id || tx._id;
      const paise =
        tx.amountPaise != null && Number.isFinite(Number(tx.amountPaise))
          ? Math.round(Number(tx.amountPaise))
          : Money.toCents(tx.amount);
      return { ...tx, id, amountPaise: paise, amount: Money.fromCents(paise) };
    },
  };

  const els = {
    generateInsightsBtn: document.getElementById("generate-insights-btn"),
    aiInsightsList: document.getElementById("ai-insights-list"),
    chatbotToggle: document.getElementById("chatbot-toggle"),
    chatbotWindow: document.getElementById("chatbot-window"),
    chatbotClose: document.getElementById("chatbot-close"),
    chatMessages: document.getElementById("chat-messages"),
    chatInput: document.getElementById("chat-input"),
    chatSend: document.getElementById("chat-send"),
    form: document.getElementById("transaction-form"),
    formTitle: document.getElementById("form-title"),
    submitBtn: document.getElementById("submit-btn"),
    cancelEditBtn: document.getElementById("cancel-edit"),
    formError: document.getElementById("form-error"),
    type: document.getElementById("type"),
    account: document.getElementById("account"),
    balanceCash: document.getElementById("balance-cash"),
    balanceUpi: document.getElementById("balance-upi"),
    balanceBank: document.getElementById("balance-bank"),
    balanceCard: document.getElementById("balance-card"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    customCategoryWrapper: document.getElementById("custom-category-wrapper"),
    customCategory: document.getElementById("custom-category"),
    date: document.getElementById("date"),
    description: document.getElementById("description"),
    totalBalance: document.getElementById("total-balance"),
    totalIncome: document.getElementById("total-income"),
    totalExpense: document.getElementById("total-expense"),
    topCategory: document.getElementById("top-category"),
    trendChip: document.getElementById("trend-chip"),
    healthLabel: document.getElementById("health-label"),
    streakLabel: document.getElementById("streak-label"),
    healthFill: document.getElementById("health-fill"),
    list: document.getElementById("transaction-list"),
    summaryLine: document.getElementById("summary-line"),
    insightList: document.getElementById("insight-list"), // may be null if AI panel used instead
    toast: document.getElementById("toast"),
    timeFilter: document.getElementById("time-filter"),
    chartType: document.getElementById("chart-type"),
    seedDataBtn: document.getElementById("seed-data"),
    clearDataBtn: document.getElementById("clear-data"),
    themeToggle: document.getElementById("theme-toggle"),
    themeIcon: document.getElementById("theme-icon"),
    themeLabel: document.getElementById("theme-label"),
    exportBtn: document.getElementById("export-csv"),
    exportPdfBtn: document.getElementById("export-pdf"),
    chartCanvas: document.getElementById("expense-chart"),
    confirmModal: document.getElementById("confirm-modal"),
    modalCancel: document.getElementById("modal-cancel"),
    modalConfirm: document.getElementById("modal-confirm"),
    budgetModal: document.getElementById("budget-modal"),
    budgetModalIcon: document.getElementById("budget-modal-icon"),
    budgetModalTitle: document.getElementById("budget-modal-title"),
    budgetModalMessage: document.getElementById("budget-modal-message"),
    budgetModalClose: document.getElementById("budget-modal-close"),
    budgetForm: document.getElementById("budget-form"),
    budgetCategory: document.getElementById("budget-category"),
    budgetAmount: document.getElementById("budget-amount"),
    budgetList: document.getElementById("budget-list"),
    recurringForm: document.getElementById("recurring-form"),
    recurringType: document.getElementById("recurring-type"),
    recurringAmount: document.getElementById("recurring-amount"),
    recurringCategory: document.getElementById("recurring-category"),
    recurringDay: document.getElementById("recurring-day"),
    recurringDescription: document.getElementById(
      "recurring-description",
    ),
    recurringList: document.getElementById("recurring-list"),
    alertsList: document.getElementById("alerts-list"),
    voiceTrigger: document.getElementById("voice-trigger"),
    mobileMenuBtn: document.getElementById("mobile-menu-btn"),
    mobileMenuDropdown: document.getElementById("mobile-menu-dropdown"),
    mobileThemeIcon: document.getElementById("mobile-theme-icon"),
    mobileThemeLabel: document.getElementById("mobile-theme-label"),
    mobileAddBtn: document.getElementById("mobile-add-btn"),
    addSheetBackdrop: document.getElementById("add-sheet-backdrop"),
    addTransactionSheet: document.getElementById("add-transaction-sheet"),
    sheetCloseBtn: document.getElementById("sheet-close-btn"),
    mobileHistoryBtn: document.getElementById("mobile-history-btn"),
    historySheetBackdrop: document.getElementById("history-sheet-backdrop"),
    historyTransactionSheet: document.getElementById("history-transaction-sheet"),
    historyCloseBtn: document.getElementById("history-close-btn"),
    mobileRecurringBtn: document.getElementById("mobile-recurring-btn"),
    recurringSheetBackdrop: document.getElementById("recurring-sheet-backdrop"),
    recurringTransactionSheet: document.getElementById("recurring-transaction-sheet"),
    recurringCloseBtn: document.getElementById("recurring-close-btn"),
    seeMoreLessBtn: document.getElementById("see-more-alerts-less-btn"),
  };

  const resolveApiUrl = () => {
    const { protocol, hostname, port } = window.location;
    if (protocol === "file:") return "http://localhost:5000/api";
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (port === "5000") return "/api";
      return "http://localhost:5000/api";
    }
    return "/api";
  };
  const API_URL = resolveApiUrl();
  const API_ORIGIN = API_URL.replace(/\/api\/?$/, "") || window.location.origin;

  // Get Firebase Auth headers for authenticated API calls
  const getAuthHeaders = async () => {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("Not authenticated. Please log in.");
    const token = await user.getIdToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };

  const safeFetch = async (url, options = {}) => {
    try {
      const authHeaders = await getAuthHeaders();
      options.headers = { ...authHeaders, ...(options.headers || {}) };
      const res = await fetch(url, options);
      const text = await res.text();
      if (!text || !text.trim()) {
        throw new Error(
          "Server returned an empty response. Run npm start and open http://localhost:5000",
        );
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server response was not valid JSON. Check server logs for errors.");
      }
      if (!res.ok) throw new Error(data.error || data.message || `Server error ${res.status}`);
      return data;
    } catch (err) {
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        throw new Error(
          "Cannot reach the AI server. Run npm start in the project folder, then open http://localhost:5000 (not Live Server).",
        );
      }
      throw err;
    }
  };

  const ChatAssistant = {
    filterLabel(filter) {
      if (filter === "weekly") return "last 7 days";
      if (filter === "monthly") return "this month";
      if (filter === "yearly") return "this year";
      return "all time";
    },
    tryLocalReply(text, transactions, filter) {
      const q = text.toLowerCase().trim();
      const label = ChatAssistant.filterLabel(filter);
      const scoped = Analytics.getFiltered(transactions, filter);
      const totals = Analytics.totals(scoped);
      const accounts = Analytics.accountBalances(transactions);
      const fmt = UI.formatCurrency.bind(UI);

      if (
        /^(total\s+)?balance$|what(?:'s| is) my (?:total )?balance|current balance|net balance/.test(
          q,
        )
      ) {
        return `Your ${label} net balance is ${fmt(totals.balance)} (Income: ${fmt(totals.income)}, Expenses: ${fmt(totals.expense)}).`;
      }
      if (/^balance$/.test(q)) {
        return `Your net balance for ${label} is ${fmt(totals.balance)}.`;
      }
      if (/total income|how much did i earn|my income/.test(q)) {
        return `Your total income for ${label} is ${fmt(totals.income)}.`;
      }
      if (/total expense|how much did i spend|my spending|total expenses/.test(q)) {
        return `Your total expenses for ${label} are ${fmt(totals.expense)}.`;
      }
      if (/account balance|balances by account/.test(q)) {
        return `Account balances (all time): Cash ${fmt(accounts.cash)}, UPI ${fmt(accounts.upi)}, Bank ${fmt(accounts.bank)}, Card ${fmt(accounts.card)}.`;
      }
      const top = Analytics.getTopCategory(
        Analytics.expensesByCategory(
          Analytics.getFiltered(
            transactions.filter((t) => t.type === "expense"),
            filter,
          ),
        ),
      );
      if (/top (category|spending)|biggest expense/.test(q) && top) {
        return `Your top spending category for ${label} is ${UI.titleCase(top[0])} at ${fmt(top[1])}.`;
      }
      return null;
    },
    async apiReachable() {
      try {
        const res = await fetch(`${API_URL}/ai/health`, { method: "GET" });
        return res.ok;
      } catch {
        return false;
      }
    },
  };



  const Store = {
    async loadTransactions() {
      try {
        const response = await safeFetch(`${API_URL}/transactions`);
        return response.data || [];
      } catch (err) {
        console.error("Load failed:", err);
        return [];
      }
    },
    async saveTransaction(tx) {
      try {
        const response = await safeFetch(`${API_URL}/transactions`, {
          method: "POST",
          body: JSON.stringify(tx)
        });
        
        // Sync balances in background if needed (API should return updated balance)
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    async updateTransaction(id, tx) {
      try {
        const response = await safeFetch(`${API_URL}/transactions/${id}`, {
          method: "PUT",
          body: JSON.stringify(tx)
        });
        return response.data;
      } catch (err) {
        throw err;
      }
    },
    async deleteTransaction(id) {
      try {
        await safeFetch(`${API_URL}/transactions/${id}`, {
          method: "DELETE"
        });
      } catch (err) {
        throw err;
      }
    },
    async deleteAllTransactions() {
      try {
        await safeFetch(`${API_URL}/transactions`, {
          method: "DELETE"
        });
      } catch (err) {
        throw err;
      }
    },
    loadTheme() {
      return localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
    },
    saveTheme(theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    },
    loadBudgets() {
      try {
        const raw = localStorage.getItem(userStorageKey(STORAGE_KEYS.BUDGETS));
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    },
    saveBudgets(budgets) {
      localStorage.setItem(
        userStorageKey(STORAGE_KEYS.BUDGETS),
        JSON.stringify(budgets),
      );
    },
    loadRecurring() {
      try {
        const raw = localStorage.getItem(userStorageKey(STORAGE_KEYS.RECURRING));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    saveRecurring(recurring) {
      localStorage.setItem(
        userStorageKey(STORAGE_KEYS.RECURRING),
        JSON.stringify(recurring),
      );
    },
    loadAlerts() {
      try {
        const raw = localStorage.getItem(userStorageKey(STORAGE_KEYS.ALERTS));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    saveAlerts(alerts) {
      localStorage.setItem(
        userStorageKey(STORAGE_KEYS.ALERTS),
        JSON.stringify(alerts),
      );
    },
  };



  const API = {
    AI: {
      async parseSms(sms) {
        return safeFetch(`${API_URL}/ai/parse-sms`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sms })
        });
      },
      async getInsights(transactions) {
        return safeFetch(`${API_URL}/ai/insights`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions })
        });
      },
      async chat(message, history, transactions) {
        return safeFetch(`${API_URL}/ai/chat`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, history, transactions })
        });
      }
    }
  };

  const Analytics = {
    getFiltered(transactions, filter) {
      if (filter === "all") return [...transactions];
      const now = new Date();
      const nowDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      return transactions.filter((tx) => {
        const txDate = new Date(tx.date);
        if (Number.isNaN(txDate.getTime())) return false;

        if (filter === "yearly") {
          return txDate.getFullYear() === now.getFullYear();
        }

        if (filter === "monthly") {
          return (
            txDate.getFullYear() === now.getFullYear() &&
            txDate.getMonth() === now.getMonth()
          );
        }

        const diffDays = Math.floor(
          (nowDate -
            new Date(
              txDate.getFullYear(),
              txDate.getMonth(),
              txDate.getDate(),
            )) /
          86400000,
        );
        return diffDays >= 0 && diffDays < 7;
      });
    },
    accountBalances(transactions) {
      const cents = { cash: 0, upi: 0, bank: 0, card: 0 };
      transactions.forEach((tx) => {
        const a = tx.account || "cash";
        const delta =
          tx.type === "income"
            ? Money.toCents(tx.amount)
            : -Money.toCents(tx.amount);
        cents[a] = (cents[a] || 0) + delta;
      });
      return {
        cash: Money.fromCents(cents.cash),
        upi: Money.fromCents(cents.upi),
        bank: Money.fromCents(cents.bank),
        card: Money.fromCents(cents.card),
      };
    },
    totals(transactions) {
      const income = Money.sum(
        transactions.filter((t) => t.type === "income").map((t) => t.amount),
      );
      const expense = Money.sum(
        transactions.filter((t) => t.type === "expense").map((t) => t.amount),
      );
      return {
        income,
        expense,
        balance: Money.subtract(income, expense),
      };
    },
    expensesByCategory(transactions) {
      const centsByCat = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((tx) => {
          const cat = tx.category;
          centsByCat[cat] = (centsByCat[cat] || 0) + Money.toCents(tx.amount);
        });
      return Object.fromEntries(
        Object.entries(centsByCat).map(([cat, c]) => [
          cat,
          Money.fromCents(c),
        ]),
      );
    },
    getTopCategory(categoryTotals) {
      const entries = Object.entries(categoryTotals).sort(
        (a, b) => b[1] - a[1],
      );
      return entries[0] || null;
    },
    monthlyBreakdown(transactions) {
      const now = new Date();
      const currentMonth = transactions.filter((tx) => {
        const d = new Date(tx.date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      });
      const lastMonth = transactions.filter((tx) => {
        const d = new Date(tx.date);
        const thisMonthDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
        const previousMonthDate = new Date(thisMonthDate);
        previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
        return (
          d.getFullYear() === previousMonthDate.getFullYear() &&
          d.getMonth() === previousMonthDate.getMonth()
        );
      });

      return { currentMonth, lastMonth };
    },
    spendingTrend(transactions) {
      const { currentMonth, lastMonth } =
        Analytics.monthlyBreakdown(transactions);
      const currentExpense = Money.sum(
        currentMonth
          .filter((t) => t.type === "expense")
          .map((t) => t.amount),
      );
      const lastExpense = Money.sum(
        lastMonth
          .filter((t) => t.type === "expense")
          .map((t) => t.amount),
      );

      if (!currentExpense && !lastExpense) {
        return { text: "No monthly trend yet", tone: "neutral" };
      }
      if (!lastExpense && currentExpense > 0) {
        return { text: "New spending this month", tone: "neutral" };
      }

      const pct = ((currentExpense - lastExpense) / lastExpense) * 100;
      if (Math.abs(pct) < 1)
        return { text: "Spending steady vs last month", tone: "neutral" };
      if (pct > 0)
        return {
          text: `Spending +${pct.toFixed(1)}% vs last month`,
          tone: "negative",
        };
      return {
        text: `Spending ${pct.toFixed(1)}% vs last month`,
        tone: "positive",
      };
    },
    activityStreak(transactions) {
      const uniqueDays = [...new Set(transactions.map((tx) => tx.date))];
      const daySet = new Set(uniqueDays);
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 365; i += 1) {
        const day = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() - i,
        )
          .toISOString()
          .slice(0, 10);
        if (!daySet.has(day)) break;
        streak += 1;
      }
      return streak;
    },
    healthScore(transactions, budgets, recurring) {
      const { currentMonth } = Analytics.monthlyBreakdown(transactions);
      const totals = Analytics.totals(currentMonth);
      const savingRatio =
        totals.income > 0
          ? Math.max(
            Math.min((totals.balance / totals.income) * 100, 100),
            -100,
          )
          : 0;
      const monthByCat = Analytics.expensesByCategory(currentMonth);
      const budgetItems = Object.entries(budgets);
      const budgetPressure = budgetItems.length
        ? budgetItems.reduce(
          (acc, [cat, lim]) => acc + (monthByCat[cat] || 0) / lim,
          0,
        ) / budgetItems.length
        : 0.7;
      const recurringCoverage = recurring.length
        ? recurring.filter((r) =>
          currentMonth.some((tx) => tx.recurringId === r.id),
        ).length / recurring.length
        : 1;
      const streakBonus = Math.min(
        Analytics.activityStreak(transactions) * 4,
        20,
      );
      const raw =
        55 +
        savingRatio * 0.25 -
        Math.max(0, budgetPressure - 1) * 25 +
        recurringCoverage * 10 +
        streakBonus;
      return Math.round(Math.min(Math.max(raw, 0), 100));
    },
  };

  const AIEngine = {
    generateInsights(transactions) {
      const insights = [];
      const { currentMonth, lastMonth } =
        Analytics.monthlyBreakdown(transactions);
      const currentTotals = Analytics.expensesByCategory(currentMonth);
      const lastTotals = Analytics.expensesByCategory(lastMonth);
      const currentExpense = Money.sum(
        currentMonth
          .filter((t) => t.type === "expense")
          .map((t) => t.amount),
      );

      // Yearly Insights
      const now = new Date();
      const currentYear = transactions.filter((tx) => new Date(tx.date).getFullYear() === now.getFullYear());
      const yearlyExpense = Money.sum(
        currentYear
          .filter((t) => t.type === "expense")
          .map((t) => t.amount),
      );
      const yearlyIncome = Money.sum(
        currentYear
          .filter((t) => t.type === "income")
          .map((t) => t.amount),
      );
      
      if (yearlyIncome > 0) {
        const net = Money.subtract(yearlyIncome, yearlyExpense);
        if (net >= 0) {
          const savingsRate = ((net / yearlyIncome) * 100).toFixed(1);
          insights.push(`Yearly Snapshot: You've saved ${savingsRate}% of your income this year.`);
        } else {
          const overspentRate = ((Math.abs(net) / yearlyIncome) * 100).toFixed(1);
          insights.push(`Yearly Snapshot: You've overspent your income by ${overspentRate}% this year.`);
        }
      }

      if (!currentExpense) {
        if (insights.length === 0) {
            return ["Add more transactions to generate AI spending insights."];
        }
        return insights;
      }

      const foodSpend = currentTotals.food || 0;
      if (foodSpend > currentExpense * 0.35)
        insights.push(
          "You are spending too much on food compared to your monthly expenses.",
        );
      if (
        (currentTotals.gaming || 0) > (lastTotals.gaming || 0) * 1.2 &&
        (currentTotals.gaming || 0) > 0
      )
        insights.push("Your gaming expenses increased this month.");
      if ((currentTotals.bills || 0) > currentExpense * 0.3)
        insights.push(
          "Bills are taking a large share of your spending. Consider reducing utilities usage.",
        );

      const top = Analytics.getTopCategory(currentTotals);
      if (top)
        insights.push(`Most of your spend is on ${top[0]} this month.`);
      if (insights.length <= 1)
        insights.push(
          "Spending is fairly balanced this month. Keep tracking consistently.",
        );
      return insights;
    },
  };

  const UI = {
    chart: null,
    destroyChartIfNeeded(newType) {
      if (!UI.chart) return;
      if (UI.chart.config.type === newType) return;
      UI.chart.destroy();
      UI.chart = null;
    },
    formatCurrency(value) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Money.round(value));
    },
    escapeHtml(text) {
      return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    },
    titleCase(text) {
      return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
    },
    syncTheme(theme) {
      document.body.setAttribute("data-theme", theme);
      els.themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
      els.themeIcon.textContent = theme === "dark" ? "\uD83C\uDF19" : "\uD83D\uDD06";
      if (els.mobileThemeLabel) els.mobileThemeLabel.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
      if (els.mobileThemeIcon) els.mobileThemeIcon.textContent = theme === "dark" ? "\uD83D\uDD06" : "\uD83C\uDF19";
    },
    updateCards(totals, topCategoryData) {
      if (!topCategoryData)
        return (els.topCategory.textContent = "No expenses yet");
      const [name, value] = topCategoryData;
      const icon = CATEGORY_META[name]?.icon || "📌";
      els.topCategory.textContent = `${icon} ${UI.titleCase(name)} (${UI.formatCurrency(value)})`;
    },
    updateSummary(filteredTransactions, totals, filter) {
      const label =
        filter === "weekly"
          ? "last 7 days"
          : filter === "monthly"
            ? "this month"
            : filter === "yearly"
              ? "this year"
              : "all time";
      els.summaryLine.textContent = !filteredTransactions.length
        ? `No transactions found for ${label}.`
        : `Summary for ${label}: Income ${UI.formatCurrency(totals.income)} | Expense ${UI.formatCurrency(totals.expense)} | Net ${UI.formatCurrency(totals.balance)}`;
    },
    updateInsights(insights) {
      if (els.insightList) {
        els.insightList.innerHTML = insights
          .map((line) => `<li>${UI.escapeHtml(line)}</li>`)
          .join("");
      }
    },
    setEditingState(isEditing) {
      els.formTitle.textContent = isEditing
        ? "Edit Transaction"
        : "Add Transaction";
      els.submitBtn.textContent = isEditing
        ? "Save Changes"
        : "Add Transaction";
      els.cancelEditBtn.classList.toggle("hidden", !isEditing);
    },
    resetForm() {
      els.form.reset();
      els.date.value = new Date().toISOString().slice(0, 10);
      els.formError.textContent = "";
    },
    setModalOpen(isOpen) {
      els.confirmModal.classList.toggle("hidden", !isOpen);
    },
    setBudgetModalOpen(isOpen, title = "", message = "", isCritical = false) {
      if (!els.budgetModal) return;
      if (isOpen) {
        els.budgetModalTitle.textContent = title;
        els.budgetModalMessage.textContent = message;
        
        const modalContent = els.budgetModal.querySelector('.modal-content');
        if (isCritical) {
          els.budgetModalIcon.textContent = "\uD83D\uDEA8";
          els.budgetModalIcon.style.animation = "pulseVoice 1s infinite";
          modalContent.style.borderTopColor = "var(--expense)";
          els.budgetModalClose.style.background = "var(--expense)";
        } else {
          els.budgetModalIcon.textContent = "\u26A0\uFE0F";
          els.budgetModalIcon.style.animation = "none";
          modalContent.style.borderTopColor = "var(--warning)";
          els.budgetModalClose.style.background = "var(--warning)";
        }
      }
      els.budgetModal.classList.toggle("hidden", !isOpen);
    },
    setCurrency(el, target) {
      if (!el) return;
      if (el._currencyAnimFrame) {
        cancelAnimationFrame(el._currencyAnimFrame);
        el._currencyAnimFrame = null;
      }
      const end = Money.round(target);
      el.dataset.value = String(end);
      el.textContent = UI.formatCurrency(end);
    },
    showToast(message) {
      if (!els.toast) return;
      els.toast.textContent = message;
      els.toast.classList.add("show");
      clearTimeout(UI.toastTimer);
      UI.toastTimer = setTimeout(
        () => els.toast.classList.remove("show"),
        1800,
      );
    },
    updateTrendChip(trend) {
      els.trendChip.textContent = trend.text;
      els.trendChip.classList.remove("positive", "negative");
      if (trend.tone === "positive")
        els.trendChip.classList.add("positive");
      if (trend.tone === "negative")
        els.trendChip.classList.add("negative");
    },
    updateHealth(score, streak) {
      els.healthLabel.textContent = `Health Score: ${score}/100`;
      els.streakLabel.textContent = `${streak}d streak`;
      els.healthFill.style.width = `${score}%`;
    },
    renderAlerts(alerts) {
      const seeMoreContainer = document.getElementById("see-more-alerts-container");
      const seeMoreBtn = document.getElementById("see-more-alerts-btn");
      const seeLessBtn = els.seeMoreLessBtn;

      if (!alerts.length) {
        els.alertsList.innerHTML =
          '<li class="alert-item">No alerts yet. All systems look healthy.</li>';
        if (seeMoreContainer) seeMoreContainer.style.display = "none";
        return;
      }

      const isMobile = window.innerWidth <= 768;
      const initialLimit = isMobile ? 3 : 5;
      if (window.alertsLimit === undefined) {
        window.alertsLimit = initialLimit;
      }

      const visible = alerts.slice(0, window.alertsLimit);

      els.alertsList.innerHTML = visible
        .map(
          (a) =>
            `<li class="alert-item">${UI.escapeHtml(a.message)}<span class="alert-meta">${new Date(a.at).toLocaleString()}</span></li>`,
        )
        .join("");

      if (seeMoreContainer && seeMoreBtn) {
        const hasMore = alerts.length > window.alertsLimit;
        const canShowLess = window.alertsLimit > initialLimit;

        if (hasMore || canShowLess) {
          seeMoreContainer.style.display = "block";
          seeMoreBtn.style.display = hasMore ? "inline-block" : "none";
          seeLessBtn.style.display = canShowLess ? "inline-block" : "none";

          seeMoreBtn.onclick = () => {
            window.alertsLimit += isMobile ? 3 : 5;
            UI.renderAlerts(alerts);
          };

          seeLessBtn.onclick = () => {
            window.alertsLimit = initialLimit;
            UI.renderAlerts(alerts);
          };
        } else {
          seeMoreContainer.style.display = "none";
        }
      }
    },
    setFormValues(tx) {
      els.type.value = tx.type;
      const paise = Money.toCents(tx.amount);
      const whole = Math.trunc(Math.abs(paise) / 100);
      const frac = Math.abs(paise) % 100;
      els.amount.value =
        frac > 0 ? `${whole}.${String(frac).padStart(2, "0")}` : String(whole);
      els.category.value = tx.category;
      els.date.value = tx.date;
      els.description.value = tx.description;
    },
    renderTransactions(transactions) {
      const seeMoreContainer = document.getElementById("see-more-container");
      const seeMoreBtn = document.getElementById("see-more-btn");
      
      if (!transactions.length) {
        els.list.innerHTML =
          '<li class="transaction-item">No transactions yet. Add one to see live insights and animations.</li>';
        if (seeMoreContainer) seeMoreContainer.style.display = "none";
        return;
      }
      
      window.txLimit = window.txLimit || 5;
      const sorted = transactions.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
        const timeB = b.createdAt ? new Date(b.createdAt) : new Date(b.date);
        return timeB - timeA;
      });
      const visible = sorted.slice(0, window.txLimit);

      els.list.innerHTML = visible
        .map((tx) => {
          const meta = CATEGORY_META[tx.category] || { icon: "📌" };
          return `
            <li class="transaction-item">
              <div class="tx-main">
                <div class="tx-icon">${meta.icon}</div>
                <div class="tx-details">
                  <span class="tx-desc">${UI.escapeHtml(tx.description)}</span>
                  <span class="tx-meta">${UI.titleCase(tx.category)} • ${tx.date}</span>
                </div>
              </div>
              <div class="tx-right" style="display:flex; align-items:center; gap:1rem;">
                <span class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "-"}${UI.formatCurrency(tx.amount)}</span>
                <div style="display:flex; gap:0.4rem;">
                  <button class="ghost-btn edit-btn" style="padding:0.3rem 0.6rem; font-size:0.7rem;" data-id="${tx.id}">Edit</button>
                  <button class="ghost-btn delete-btn" style="padding:0.3rem 0.6rem; font-size:0.7rem;" data-id="${tx.id}">Delete</button>
                </div>
              </div>
            </li>`;
        })
        .join("");

      if (seeMoreContainer && seeMoreBtn) {
        if (sorted.length > window.txLimit) {
          seeMoreContainer.style.display = "block";
          seeMoreBtn.onclick = () => {
             window.txLimit += 5;
             UI.renderTransactions(transactions);
          };
        } else {
          seeMoreContainer.style.display = "none";
        }
      }
    },
    renderBudgets(budgets, monthlyExpensesByCategory) {
      const entries = Object.entries(budgets);
      if (!entries.length) {
        els.budgetList.innerHTML =
          '<li class="budget-item">No budgets yet. Add one to track monthly limits.</li>';
        return;
      }
      els.budgetList.innerHTML = entries
        .map(([category, limit]) => {
          const spent = monthlyExpensesByCategory[category] || 0;
          const ratio =
            limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
          const isOver = spent > limit;
          return `<li class="budget-item ${isOver ? "over" : ""}">
              <div class="budget-head">
                <strong>${UI.titleCase(category)}</strong>
                <span>${UI.formatCurrency(spent)} / ${UI.formatCurrency(limit)}</span>
              </div>
              <div class="budget-progress"><span style="width:${ratio}%"></span></div>
              <div class="tx-right" style="margin-top:0.6rem; display:flex; justify-content:space-between; align-items:center;">
                <small style="color:var(--text-muted);">${isOver ? "Over budget" : `${(100 - ratio).toFixed(0)}% remaining`}</small>
                <button class="ghost-btn delete-budget-btn" style="padding:0.25rem 0.6rem; font-size:0.7rem;" data-category="${category}" type="button">Remove</button>
              </div>
            </li>`;
        })
        .join("");
    },
    renderRecurring(recurring) {
      if (!recurring.length) {
        els.recurringList.innerHTML =
          '<li class="transaction-item">No recurring rules yet.</li>';
        return;
      }
      els.recurringList.innerHTML = recurring
        .map((rule) => {
          const icon = CATEGORY_META[rule.category]?.icon || "📌";
          return `<li class="transaction-item">
              <div class="tx-main">
                <div class="tx-icon">${icon}</div>
                <div class="tx-details">
                  <span class="tx-desc">${UI.escapeHtml(rule.description)}</span>
                  <span class="tx-meta">${UI.titleCase(rule.category)} • Day ${rule.day}</span>
                </div>
              </div>
              <div class="tx-right" style="display:flex; align-items:center; gap:0.75rem;">
                <span class="tx-amount ${rule.type}">${rule.type === "income" ? "+" : "-"}${UI.formatCurrency(rule.amount)}</span>
                <button class="ghost-btn delete-recurring-btn" style="padding:0.3rem 0.6rem; font-size:0.7rem;" data-id="${rule.id}" type="button">Delete</button>
              </div>
            </li>`;
        })
        .join("");
    },
    renderChart(categoryTotals, theme, chartType) {
      const labels = Object.keys(categoryTotals).map(UI.titleCase);
      const values = Object.values(categoryTotals);
      const colors = Object.keys(categoryTotals).map(
        (category) => CATEGORY_META[category]?.color || "#a29bfe",
      );
      UI.destroyChartIfNeeded(chartType);

      const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: theme === "dark" ? "#eef0ff" : "#211f46" },
          },
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.label}: ${UI.formatCurrency(context.parsed.y ?? context.parsed)}`;
              },
            },
          },
        },
      };

      if (!UI.chart) {
        UI.chart = new Chart(els.chartCanvas, {
          type: chartType,
          data: {
            labels,
            datasets: [
              {
                data: values,
                backgroundColor: colors,
                borderColor: colors,
                borderRadius: ((chartType === "bar" || chartType === "line") || chartType === "line") ? 8 : 0,
                borderWidth: chartType === "bar" ? 1 : (chartType === "line" ? 3 : 0),
                fill: chartType !== "line",
                tension: chartType === "line" ? 0.4 : 0,

              },
            ],
          },
          options: {
            ...commonOptions,
            scales:
              chartType === "bar"
                ? {
                  x: {
                    ticks: {
                      color: theme === "dark" ? "#d9dcfb" : "#2d3060",
                    },
                    grid: { color: "rgba(122, 122, 122, 0.15)" },
                  },
                  y: {
                    ticks: {
                      color: theme === "dark" ? "#d9dcfb" : "#2d3060",
                    },
                    grid: { color: "rgba(122, 122, 122, 0.15)" },
                  },
                }
                : undefined,
          },
        });
        return;
      }

      UI.chart.data.labels = labels;
      UI.chart.data.datasets[0].data = values;
      UI.chart.data.datasets[0].backgroundColor = colors;
      UI.chart.data.datasets[0].borderColor = colors;
      UI.chart.data.datasets[0].borderRadius =
        chartType === "bar" ? 8 : 0;
      UI.chart.data.datasets[0].borderWidth = chartType === "bar" ? 1 : (chartType === "line" ? 3 : 0);
      if (chartType === "line") { UI.chart.data.datasets[0].fill = false; UI.chart.data.datasets[0].tension = 0.4; }
      UI.chart.options.plugins.legend.labels.color =
        theme === "dark" ? "#eef0ff" : "#211f46";
      UI.chart.options.scales =
        chartType === "bar"
          ? {
            x: {
              ticks: {
                color: theme === "dark" ? "#d9dcfb" : "#2d3060",
              },
              grid: { color: "rgba(122, 122, 122, 0.15)" },
            },
            y: {
              ticks: {
                color: theme === "dark" ? "#d9dcfb" : "#2d3060",
              },
              grid: { color: "rgba(122, 122, 122, 0.15)" },
            },
          }
          : undefined;
      UI.chart.update();
    },
  };

  const App = {
    state: {
      transactions: [],
      budgets: {},
      recurring: [],
      alerts: [],
      alertSeen: {},
      editingId: null,
      filter: "monthly",
      theme: Store.loadTheme(),
      chartType: "pie",
      chatHistory: [],
    },
    clearUserData() {
      App.state.transactions = [];
      App.state.budgets = {};
      App.state.recurring = [];
      App.state.alerts = [];
      App.state.alertSeen = {};
      App.state.editingId = null;
      App.state.chatHistory = [];
      window.txLimit = 5;
      window.alertsLimit = undefined;
      if (UI.chart) {
        UI.chart.destroy();
        UI.chart = null;
      }
      UI.resetForm();
      UI.setEditingState(false);
      if (els.list) {
        els.list.innerHTML =
          '<li class="transaction-item">Sign in to view your transactions.</li>';
      }
      if (els.totalBalance) els.totalBalance.textContent = "₹0.00";
      if (els.totalIncome) els.totalIncome.textContent = "₹0.00";
      if (els.totalExpense) els.totalExpense.textContent = "₹0.00";
      if (els.balanceCash) els.balanceCash.textContent = "₹0.00";
      if (els.balanceUpi) els.balanceUpi.textContent = "₹0.00";
      if (els.balanceBank) els.balanceBank.textContent = "₹0.00";
      if (els.balanceCard) els.balanceCard.textContent = "₹0.00";
    },
    async loadUserData() {
      const user = firebase.auth().currentUser || { uid: window.__currentUid };
      if (!user || !user.uid) return;
      
      try {
        App.state.budgets = Store.loadBudgets();
        App.state.recurring = Store.loadRecurring();
        App.state.alerts = Store.loadAlerts();
        
        const loaded = await Store.loadTransactions();
        App.state.transactions = loaded.map((tx) => Money.normalizeTransaction(tx));
        
        await App.processRecurringTransactions();
        App.render();
      } catch (err) {
        console.error("Failed to load user data:", err);
        UI.showToast("Failed to load data. Please refresh.");
      }
    },
    async init() {
      UI.syncTheme(App.state.theme);
      UI.resetForm();
      UI.setEditingState(false);
      document
        .querySelectorAll(".stat-card, .panel")
        .forEach((node, i) => {
          node.style.animationDelay = `${Math.min(i * 70, 350)}ms`;
        });
      App.bindEvents();
      App.initAddSheet();
      App.initHistorySheet();
      App.initRecurringSheet();
      await App.loadUserData();
    },
    initAddSheet() {
      if (!els.mobileAddBtn || !els.addSheetBackdrop || !els.addTransactionSheet) return;

      const openSheet = () => {
        document.body.classList.add("no-scroll");
        els.addSheetBackdrop.classList.remove("hidden");
        setTimeout(() => {
          els.addTransactionSheet.classList.add("open");
        }, 10);
      };

      const closeSheet = () => {
        els.addTransactionSheet.classList.remove("open");
        setTimeout(() => {
          els.addSheetBackdrop.classList.add("hidden");
          document.body.classList.remove("no-scroll");
        }, 300);
      };

      els.mobileAddBtn.addEventListener("click", openSheet);
      if(els.sheetCloseBtn) els.sheetCloseBtn.addEventListener("click", closeSheet);
      els.addSheetBackdrop.addEventListener("click", closeSheet);

      App.closeAddSheet = closeSheet;
    },
    initHistorySheet() {
      if (!els.mobileHistoryBtn || !els.historySheetBackdrop || !els.historyTransactionSheet) return;

      const openSheet = () => {
        document.body.classList.add("no-scroll");
        els.historySheetBackdrop.classList.remove("hidden");
        setTimeout(() => {
          els.historyTransactionSheet.classList.add("open");
        }, 10);
      };

      const closeSheet = () => {
        els.historyTransactionSheet.classList.remove("open");
        setTimeout(() => {
          els.historySheetBackdrop.classList.add("hidden");
          document.body.classList.remove("no-scroll");
        }, 300);
      };

      els.mobileHistoryBtn.addEventListener("click", openSheet);
      if(els.historyCloseBtn) els.historyCloseBtn.addEventListener("click", closeSheet);
      els.historySheetBackdrop.addEventListener("click", closeSheet);

      App.closeHistorySheet = closeSheet;
    },
    initRecurringSheet() {
      if (!els.mobileRecurringBtn || !els.recurringSheetBackdrop || !els.recurringTransactionSheet) return;

      const openSheet = () => {
        document.body.classList.add("no-scroll");
        els.recurringSheetBackdrop.classList.remove("hidden");
        setTimeout(() => {
          els.recurringTransactionSheet.classList.add("open");
        }, 10);
      };

      const closeSheet = () => {
        els.recurringTransactionSheet.classList.remove("open");
        setTimeout(() => {
          els.recurringSheetBackdrop.classList.add("hidden");
          document.body.classList.remove("no-scroll");
        }, 300);
      };

      els.mobileRecurringBtn.addEventListener("click", openSheet);
      if(els.recurringCloseBtn) els.recurringCloseBtn.addEventListener("click", closeSheet);
      els.recurringSheetBackdrop.addEventListener("click", closeSheet);

      App.closeRecurringSheet = closeSheet;
    },
    bindEvents() {
      els.form.addEventListener("submit", App.handleFormSubmit);
      els.cancelEditBtn.addEventListener("click", App.cancelEdit);
      if (els.generateInsightsBtn) els.generateInsightsBtn.addEventListener("click", App.generateAIInsights);
      if (els.chatbotToggle) els.chatbotToggle.addEventListener("click", App.toggleChatbot);
      if (els.chatbotClose) els.chatbotClose.addEventListener("click", App.toggleChatbot);
      if (els.chatSend) els.chatSend.addEventListener("click", App.handleChatSend);
      if (els.chatInput) els.chatInput.addEventListener("keypress", (e) => { if (e.key === 'Enter') App.handleChatSend(); });
      if (els.voiceTrigger) els.voiceTrigger.addEventListener("click", App.handleVoiceTransaction);
      // Quick prompt chip buttons
      document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          els.chatInput.value = btn.dataset.prompt;
          App.handleChatSend();
        });
      });
      els.description.addEventListener("input", App.handleSmartCategory);
      els.category.addEventListener("change", App.handleCategoryChange);
      els.timeFilter.addEventListener("change", (e) => {
        App.state.filter = e.target.value;
        App.render();
      });
      els.chartType.addEventListener("change", (e) => {
        App.state.chartType = e.target.value;
        App.render();
      });
      els.list.addEventListener("click", App.handleListAction);
      els.budgetForm.addEventListener("submit", App.handleBudgetSubmit);
      els.recurringForm.addEventListener(
        "submit",
        App.handleRecurringSubmit,
      );
      els.budgetList.addEventListener(
        "click",
        App.handleBudgetListAction,
      );
      els.recurringList.addEventListener(
        "click",
        App.handleRecurringListAction,
      );
      document
        .querySelectorAll("[data-quick-add]")
        .forEach((btn) =>
          btn.addEventListener("click", App.handleQuickAdd),
        );
      els.themeToggle.addEventListener("click", App.toggleTheme);
      els.exportBtn.addEventListener("click", App.exportCSV);
      els.exportPdfBtn.addEventListener("click", App.exportPDF);
      els.seedDataBtn.addEventListener("click", App.seedDemoData);
      els.clearDataBtn.addEventListener("click", App.openClearModal);
      els.modalCancel.addEventListener("click", App.closeClearModal);
      els.modalConfirm.addEventListener("click", App.clearAllData);
      els.confirmModal.addEventListener("click", (e) => {
        if (e.target === els.confirmModal) App.closeClearModal();
      });
      if (els.budgetModalClose) els.budgetModalClose.addEventListener("click", () => UI.setBudgetModalOpen(false));
      if (els.budgetModal) els.budgetModal.addEventListener("click", (e) => {
        if (e.target === els.budgetModal) UI.setBudgetModalOpen(false);
      });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") App.closeClearModal();
      });
      if (els.mobileMenuBtn) els.mobileMenuBtn.addEventListener("click", App.toggleMobileMenu);
      document.querySelectorAll(".mobile-dropdown-item").forEach(item => {
        item.addEventListener("click", App.handleMobileMenuAction);
      });
    },
    cancelEdit() {
      App.state.editingId = null;
      UI.setEditingState(false);
      UI.resetForm();
      if (App.closeAddSheet) App.closeAddSheet();
    },
    validateInput({ type, amount, category, date, description }) {
      if (!type || !category || !date || !description.trim())
        return "Please fill all fields.";
      if (!Number.isFinite(amount) || amount <= 0)
        return "Amount must be greater than zero.";
      return "";
    },
    handleCategoryChange() {
      if (els.category.value === "custom") {
        if (els.customCategoryWrapper) els.customCategoryWrapper.classList.remove("hidden");
        if (els.customCategory) els.customCategory.required = true;
      } else {
        if (els.customCategoryWrapper) els.customCategoryWrapper.classList.add("hidden");
        if (els.customCategory) els.customCategory.required = false;
      }
    },
    handleSmartCategory(event) {
      const val = event.target.value.toLowerCase();
      const rules = {
        food: ["swiggy", "zomato", "mcdonalds", "kfc", "dominos", "pizza", "burger", "coffee", "starbucks", "cafe", "restaurant", "snack", "grocery", "blinkit", "zepto"],
        travel: ["uber", "ola", "rapido", "metro", "train", "flight", "bus", "petrol", "fuel", "cab", "auto"],
        gaming: ["steam", "psn", "xbox", "nintendo", "epic games", "valorant", "riot", "game", "playstation"],
        bills: ["electricity", "water", "internet", "wifi", "broadband", "recharge", "jio", "airtel", "rent", "netflix", "prime", "spotify", "bill"],
        shopping: ["amazon", "flipkart", "myntra", "meesho", "zara", "h&m", "clothes", "shoes", "mall", "shopping", "store"],
      };
      for (const [category, keywords] of Object.entries(rules)) {
        if (keywords.some(kw => val.includes(kw))) {
          els.category.value = category;
          els.type.value = "expense";
          els.category.style.transition = "box-shadow 0.2s ease";
          els.category.style.boxShadow = "0 0 0 3px rgba(0, 210, 255, 0.5)";
          setTimeout(() => els.category.style.boxShadow = "", 500);
          break;
        }
      }
    },
    async handleVoiceTransaction() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        UI.showToast("Speech Recognition is not supported in this browser.");
        return;
      }
      
      if (els.voiceTrigger.dataset.listening === "true") return;

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        els.voiceTrigger.dataset.listening = "true";
        els.voiceTrigger.style.backgroundColor = "var(--expense)";
        els.voiceTrigger.style.transform = "scale(1.1)";
        UI.showToast("Listening... Speak your transaction");
      };

      recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        UI.showToast(`Heard: "${transcript}". Parsing with AI...`);
        
        try {
          const data = await API.AI.parseSms(transcript);
          if (els.amount) els.amount.value = Money.round(data.amount);
          if (els.description) els.description.value = data.description;
          if (els.type) els.type.value = data.type;

          const defaultCategories = ["food", "travel", "gaming", "bills", "shopping", "others"];
          if (defaultCategories.includes(data.category)) {
            if (els.category) els.category.value = data.category;
            if (els.customCategoryWrapper) els.customCategoryWrapper.classList.add("hidden");
          } else {
            if (els.category) els.category.value = "custom";
            if (els.customCategoryWrapper) els.customCategoryWrapper.classList.remove("hidden");
            if (els.customCategory) els.customCategory.value = data.category;
          }
          if (els.account && data.account) els.account.value = data.account;

          App.pushAlert("Transaction added via Voice");
          window.scrollTo({ top: 0, behavior: 'smooth' });
          els.form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } catch (err) {
          UI.showToast("AI couldn't understand: " + err.message);
        }
      };

      recognition.onerror = (event) => {
        const errorMessages = {
          'network': '\uD83D\uDD07 Network error. Please check your internet connection. (Note: Brave and Firefox may block voice features. Try Chrome or Safari.)',
          'not-allowed': '\uD83C\uDFA4 Microphone access denied. Please allow microphone permission in your browser settings.',
          'no-speech': '\uD83E\uDD2B No speech detected. Please try again and speak clearly.',
          'audio-capture': '\uD83C\uDFA4 No microphone found. Please connect a microphone.',
          'aborted': '\uD83D\uDED1 Voice input was cancelled.',
        };
        UI.showToast(errorMessages[event.error] || "Voice error: " + event.error);
      };

      recognition.onend = () => {
        els.voiceTrigger.dataset.listening = "false";
        els.voiceTrigger.style.backgroundColor = "";
        els.voiceTrigger.style.transform = "";
      };

      recognition.start();
    },
    async generateAIInsights() {
      els.generateInsightsBtn.textContent = 'Generating...';
      els.generateInsightsBtn.disabled = true;
      els.aiInsightsList.innerHTML = '<p class="muted">Analyzing your spending...</p>';
      try {
        const insights = await API.AI.getInsights(App.state.transactions);
        els.aiInsightsList.innerHTML = insights.map(i => `<div class="ai-insight-item">${UI.escapeHtml(i)}</div>`).join("");
      } catch (err) {
        els.aiInsightsList.innerHTML = `<p class="form-error">${UI.escapeHtml(err.message)}</p>`;
      } finally {
        els.generateInsightsBtn.textContent = 'Generate';
        els.generateInsightsBtn.disabled = false;
      }
    },
    toggleMobileMenu() {
      const isOpen = !els.mobileMenuDropdown.classList.contains("hidden");
      if (isOpen) {
        els.mobileMenuDropdown.classList.add("hidden");
        els.mobileMenuBtn.classList.remove("active");
        const overlay = document.querySelector(".mobile-menu-overlay");
        if (overlay) overlay.remove();
      } else {
        els.mobileMenuDropdown.classList.remove("hidden");
        els.mobileMenuBtn.classList.add("active");
        const overlay = document.createElement("div");
        overlay.className = "mobile-menu-overlay";
        overlay.onclick = App.toggleMobileMenu;
        document.body.appendChild(overlay);
      }
    },
    handleMobileMenuAction(e) {
      const action = e.currentTarget.dataset.action;
      App.toggleMobileMenu(); // Close menu after action
      switch (action) {
        case "theme": App.toggleTheme(); break;
        case "clear": App.openClearModal(); break;
        case "pdf": App.exportPDF(); break;
        case "csv": App.exportCSV(); break;
      }
    },
    toggleChatbot() {
      els.chatbotWindow.classList.toggle('hidden');
    },
    async handleChatSend() {
      const text = els.chatInput.value.trim();
      if (!text) return;

      App.state.chatHistory = App.state.chatHistory || [];

      // Hide quick prompts after first interaction
      const quickPrompts = document.getElementById('chat-quick-prompts');
      if (quickPrompts) quickPrompts.style.display = 'none';

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Append user message
      const userMsg = document.createElement('div');
      userMsg.className = 'chat-message user';
      userMsg.innerHTML = `<div class="chat-bubble">${UI.escapeHtml(text)}</div><span class="chat-time">${now}</span>`;
      els.chatMessages.appendChild(userMsg);
      els.chatInput.value = '';
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

      // Append typing indicator
      const loadingEl = document.createElement('div');
      loadingEl.className = 'chat-message bot typing';
      loadingEl.innerHTML = `<div class="chat-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>`;
      els.chatMessages.appendChild(loadingEl);
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;

      try {
        let replyText = ChatAssistant.tryLocalReply(
          text,
          App.state.transactions,
          App.state.filter,
        );
        if (!replyText) {
          const online = await ChatAssistant.apiReachable();
          if (!online) {
            throw new Error(
              'Cannot reach the AI server. Run npm start, then open http://localhost:5000. Try "total balance" for instant answers from your data.',
            );
          }
          const filteredTransactions = Analytics.getFiltered(
            App.state.transactions,
            App.state.filter,
          );
          const data = await API.AI.chat(
            text,
            App.state.chatHistory,
            filteredTransactions,
          );
          replyText = data.response;
        }
        loadingEl.remove();
        const botMsg = document.createElement('div');
        botMsg.className = 'chat-message bot';
        botMsg.innerHTML = `<div class="chat-bubble">${UI.escapeHtml(replyText)}</div><span class="chat-time">${now}</span>`;
        els.chatMessages.appendChild(botMsg);
        App.state.chatHistory.push({ role: 'user', text });
        App.state.chatHistory.push({ role: 'model', text: replyText });
      } catch (err) {
        loadingEl.remove();
        const errMsg = document.createElement('div');
        errMsg.className = 'chat-message bot';
        errMsg.innerHTML = `<div class="chat-bubble" style="border-color:rgba(255,80,80,0.3);color:#ff8080">\u26A0\uFE0F ${UI.escapeHtml(err.message)}</div>`;
        els.chatMessages.appendChild(errMsg);
      }
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    },
    async handleFormSubmit(event) {
      event.preventDefault();
      const payload = {
        type: els.type.value,
        account: els.account ? els.account.value : 'cash',
        amount: Money.parse(String(els.amount.value).trim()),
        category: els.category.value === "custom" ? els.customCategory.value.trim().toLowerCase() : els.category.value,
        date: els.date.value,
        description: els.description.value.trim(),
      };
      const error = App.validateInput(payload);
      els.formError.textContent = error;
      if (error) return;

      els.submitBtn.disabled = true;
      try {
        if (App.state.editingId) {
          const updatedTx = Money.normalizeTransaction(
            await Store.updateTransaction(App.state.editingId, payload),
          );
          const index = App.state.transactions.findIndex(t => t.id === App.state.editingId);
          if (index !== -1) App.state.transactions[index] = updatedTx;
        } else {
          const newTx = Money.normalizeTransaction(
            await Store.saveTransaction(payload),
          );
          App.state.transactions.push(newTx);
        }
        
        // Sort transactions by date descending
        App.state.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        App.pushAlert(App.state.editingId ? "Transaction updated" : "Transaction added");
        App.cancelEdit();
        if(App.closeAddSheet) App.closeAddSheet();
        App.render();
      } catch (err) {
        els.formError.textContent = err.message;
      } finally {
        els.submitBtn.disabled = false;
      }
    },
    async handleListAction(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const txId = target.dataset.id;
      if (!txId) return;
      if (target.classList.contains("delete-btn")) {
        try {
          await Store.deleteTransaction(txId);
          App.state.transactions = App.state.transactions.filter(tx => tx.id !== txId);
          App.pushAlert("Transaction deleted");
          if (App.state.editingId === txId) App.cancelEdit();
          App.render();
        } catch (err) {
          UI.showToast("Delete failed: " + err.message);
        }
        return;
      }
      if (target.classList.contains("edit-btn")) {
        const tx = App.state.transactions.find(
          (item) => item.id === txId,
        );
        if (!tx) return;
        App.state.editingId = tx.id;
        UI.setEditingState(true);
        UI.setFormValues(tx);
        UI.showToast("Editing transaction");
      }
    },
    handleBudgetSubmit(event) {
      event.preventDefault();
      const category = els.budgetCategory.value;
      const amount = Money.parse(els.budgetAmount.value);
      if (!category || !Number.isFinite(amount) || amount <= 0) {
        UI.showToast("Enter valid category and budget");
        return;
      }
      App.state.budgets[category] = amount;
      Store.saveBudgets(App.state.budgets);
      els.budgetForm.reset();
      App.pushAlert("Budget saved");
      App.render();
    },
    handleBudgetListAction(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const category = target.dataset.category;
      if (!category || !target.classList.contains("delete-budget-btn"))
        return;
      delete App.state.budgets[category];
      Store.saveBudgets(App.state.budgets);
      App.pushAlert("Budget removed");
      App.render();
    },
    handleRecurringSubmit(event) {
      event.preventDefault();
      const payload = {
        type: els.recurringType.value,
        amount: Money.parse(els.recurringAmount.value),
        category: els.recurringCategory.value,
        day: Number(els.recurringDay.value),
        description: els.recurringDescription.value.trim(),
      };
      if (
        !payload.type ||
        !payload.category ||
        !payload.description ||
        !Number.isFinite(payload.amount) ||
        payload.amount <= 0 ||
        payload.day < 1 ||
        payload.day > 28
      ) {
        UI.showToast("Please enter valid recurring details");
        return;
      }
      App.state.recurring.push({ id: crypto.randomUUID(), ...payload });
      Store.saveRecurring(App.state.recurring);
      els.recurringForm.reset();
      App.processRecurringTransactions();
      App.pushAlert("Recurring rule added");
      App.render();
    },
    handleRecurringListAction(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const id = target.dataset.id;
      if (!id || !target.classList.contains("delete-recurring-btn"))
        return;
      App.state.recurring = App.state.recurring.filter(
        (rule) => rule.id !== id,
      );
      Store.saveRecurring(App.state.recurring);
      App.pushAlert("Recurring rule removed");
      App.render();
    },
    processRecurringTransactions() {
      const now = new Date();
      let changed = false;
      App.state.recurring.forEach((rule) => {
        if (now.getDate() < rule.day) return;
        const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(rule.day).padStart(2, "0")}`;
        const alreadyAdded = App.state.transactions.some(
          (tx) => tx.recurringId === rule.id && tx.date === date,
        );
        if (!alreadyAdded) {
          const newTx = {
            type: rule.type,
            amount: rule.amount,
            category: rule.category,
            date,
            description: `${rule.description} (Auto)`,
            recurringId: rule.id,
          };
          Store.saveTransaction(newTx).then((saved) => {
            App.state.transactions.push(Money.normalizeTransaction(saved));
            App.render();
          });
          changed = true;
        }
      });
      if (changed) {
        App.render();
      }
    },
    pushAlert(message, showAsToast = true) {
      const last = App.state.alerts[0];
      if (!last || last.message !== message) {
        App.state.alerts.unshift({
          id: crypto.randomUUID(),
          message,
          at: new Date().toISOString(),
        });
        App.state.alerts = App.state.alerts.slice(0, 100);
        Store.saveAlerts(App.state.alerts);
      }
      if (showAsToast) UI.showToast(message);
    },
    handleQuickAdd(event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const key = target.dataset.quickAdd;
      const today = new Date().toISOString().slice(0, 10);
      const presets = {
        coffee: {
          type: "expense",
          amount: 180,
          category: "food",
          description: "Coffee break",
        },
        commute: {
          type: "expense",
          amount: 240,
          category: "travel",
          description: "Daily commute",
        },
        salary: {
          type: "income",
          amount: 50000,
          category: "others",
          description: "Salary credit",
        },
        bill: {
          type: "expense",
          amount: 1500,
          category: "bills",
          description: "Utility bill",
        },
        snack: {
          type: "expense",
          amount: 120,
          category: "food",
          description: "Snacks",
        },
        game: {
          type: "expense",
          amount: 999,
          category: "gaming",
          description: "Gaming purchase",
        },
      };
      const preset = presets[key];
      if (!preset) return;
      
      const newTx = {
        date: today,
        ...preset,
      };

      Store.saveTransaction(newTx).then((saved) => {
        App.state.transactions.push(Money.normalizeTransaction(saved));
        App.pushAlert(`Quick add: ${preset.description}`);
        App.render();
      }).catch(err => {
        UI.showToast("Quick add failed: " + err.message);
      });
    },
    runBudgetAlerts(monthlyExpensesByCategory) {
      const monthKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
      Object.entries(App.state.budgets).forEach(([category, limit]) => {
        const spent = monthlyExpensesByCategory[category] || 0;
        if (!limit || spent <= 0) return;
        const ratio = spent / limit;
        const key80 = `${monthKey}-budget80-${category}`;
        const key100 = `${monthKey}-budget100-${category}`;
        
        if (ratio >= 1 && !App.state.alertSeen[key100]) {
          const msg = `You have exceeded your ${UI.titleCase(category)} budget! You spent ${UI.formatCurrency(spent)} out of your ${UI.formatCurrency(limit)} limit.`;
          App.pushAlert(`${UI.titleCase(category)} budget exceeded`);
          UI.setBudgetModalOpen(true, "Budget Exceeded!", msg, true);
          App.state.alertSeen[key100] = true;
        } else if (ratio >= 0.8 && !App.state.alertSeen[key80]) {
          const msg = `You have used ${(ratio * 100).toFixed(0)}% of your ${UI.titleCase(category)} budget. Remaining: ${UI.formatCurrency(Money.subtract(limit, spent))}.`;
          App.pushAlert(`${UI.titleCase(category)} budget reached 80%`);
          UI.setBudgetModalOpen(true, "Budget Warning", msg, false);
          App.state.alertSeen[key80] = true;
        }
      });
    },
    runRecurringAlerts() {
      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      App.state.recurring.forEach((rule) => {
        const dueDate = `${ym}-${String(rule.day).padStart(2, "0")}`;
        const exists = App.state.transactions.some(
          (tx) => tx.recurringId === rule.id && tx.date === dueDate,
        );
        const missedKey = `${ym}-missed-${rule.id}`;
        const dueSoonKey = `${ym}-soon-${rule.id}`;

        if (
          now.getDate() > rule.day &&
          !exists &&
          !App.state.alertSeen[missedKey]
        ) {
          App.pushAlert(`Missed recurring: ${rule.description}`);
          App.state.alertSeen[missedKey] = true;
        } else if (
          rule.day >= now.getDate() &&
          rule.day - now.getDate() <= 2 &&
          !exists &&
          !App.state.alertSeen[dueSoonKey]
        ) {
          App.pushAlert(
            `Upcoming recurring in ${rule.day - now.getDate()} day(s): ${rule.description}`,
          );
          App.state.alertSeen[dueSoonKey] = true;
        }
      });
    },
    cancelEdit() {
      App.state.editingId = null;
      UI.setEditingState(false);
      UI.resetForm();
    },
    toggleTheme() {
      App.state.theme = App.state.theme === "dark" ? "light" : "dark";
      Store.saveTheme(App.state.theme);
      UI.syncTheme(App.state.theme);
      App.pushAlert(
        `${App.state.theme === "dark" ? "Dark" : "Light"} mode enabled`,
        false,
      );
      App.render();
    },
    exportCSV() {
      if (!App.state.transactions.length)
        return UI.showToast("No data to export");
      const headers = [
        "type",
        "amount",
        "category",
        "date",
        "description",
      ];
      const rows = App.state.transactions.map((tx) =>
        headers
          .map((key) => `"${String(tx[key]).replaceAll('"', '""')}"`)
          .join(","),
      );
      const csvData = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvData], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      App.pushAlert("CSV exported");
    },
    exportPDF() {
      if (!App.state.transactions.length)
        return UI.showToast("No data to export");
        
      const jspdfApi = window.jspdf || window;
      if (!jspdfApi.jsPDF)
        return UI.showToast("PDF library not fully loaded");
      
      const jsPDF = jspdfApi.jsPDF;
      const doc = new jsPDF();
      
      if (typeof doc.autoTable !== 'function')
        return UI.showToast("AutoTable plugin not loaded");
        
      const now = new Date();
      
      const monthly = Analytics.monthlyBreakdown(App.state.transactions).currentMonth;
      const totals = Analytics.totals(monthly);
      
      // Header Section
      doc.setFillColor(59, 130, 246); // Primary Blue
      doc.rect(0, 0, 210, 40, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Nova Financial Report", 14, 22);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 30);
      
      // Metrics Section
      doc.setTextColor(30, 41, 59); // Slate dark
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Monthly Overview", 14, 52);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(16, 185, 129); // Green
      doc.text(`Income: ${UI.formatCurrency(totals.income)}`, 14, 62);
      
      doc.setTextColor(244, 63, 94); // Red
      doc.text(`Expense: ${UI.formatCurrency(totals.expense)}`, 80, 62);
      
      doc.setTextColor(59, 130, 246); // Blue
      doc.text(`Net Balance: ${UI.formatCurrency(totals.balance)}`, 146, 62);
      
      // Table Data
      const tableData = App.state.transactions
        .slice()
        .sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt) : new Date(a.date);
          const timeB = b.createdAt ? new Date(b.createdAt) : new Date(b.date);
          return timeB - timeA;
        })
        .map(tx => [
          tx.date,
          tx.type.toUpperCase(),
          UI.titleCase(tx.category),
          UI.titleCase(tx.account),
          UI.formatCurrency(tx.amount),
          tx.description.length > 35 ? tx.description.slice(0, 35) + '...' : tx.description
        ]);
        
      // Render Table
      doc.autoTable({
        startY: 72,
        head: [['Date', 'Type', 'Category', 'Account', 'Amount', 'Description']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, textColor: [30, 41, 59] },
        columnStyles: {
          4: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 1) {
            if (data.cell.raw === 'INCOME') data.cell.styles.textColor = [16, 185, 129];
            if (data.cell.raw === 'EXPENSE') data.cell.styles.textColor = [244, 63, 94];
          }
        }
      });
      
      doc.save(`Nova-Finance-Report-${now.toISOString().slice(0, 10)}.pdf`);
      App.pushAlert("Professional PDF exported");
    },
    async seedDemoData() {
      const t = new Date();
      const iso = (d) => d.toISOString().slice(0, 10);
      const seeds = [
        { type: "income",  amount: 68000, category: "others",   account: "bank", date: iso(new Date(t.getFullYear(), t.getMonth(), 1)),  description: "Monthly salary" },
        { type: "expense", amount: 5400,  category: "food",     account: "upi",  date: iso(new Date(t.getFullYear(), t.getMonth(), 2)),  description: "Groceries and snacks" },
        { type: "expense", amount: 1900,  category: "travel",   account: "upi",  date: iso(new Date(t.getFullYear(), t.getMonth(), 4)),  description: "Cab and fuel" },
        { type: "expense", amount: 2600,  category: "gaming",   account: "card", date: iso(new Date(t.getFullYear(), t.getMonth(), 6)),  description: "Game purchase" },
        { type: "expense", amount: 4200,  category: "bills",    account: "bank", date: iso(new Date(t.getFullYear(), t.getMonth(), 8)),  description: "Electricity and internet" },
        { type: "expense", amount: 3700,  category: "shopping", account: "card", date: iso(new Date(t.getFullYear(), t.getMonth(), 10)), description: "Clothes and essentials" },
        { type: "expense", amount: 1200,  category: "others",   account: "cash", date: iso(new Date(t.getFullYear(), t.getMonth(), 12)), description: "Misc purchase" },
      ];
      els.seedDataBtn.disabled = true;
      els.seedDataBtn.textContent = 'Seeding...';
      try {
        await Promise.all(seeds.map(s => Store.saveTransaction(s)));
        const seeded = await Store.loadTransactions();
        App.state.transactions = seeded.map((tx) => Money.normalizeTransaction(tx));
        App.pushAlert("Demo data loaded");
        App.cancelEdit();
        App.render();
      } catch (err) {
        UI.showToast("Seed failed: " + err.message);
      } finally {
        els.seedDataBtn.disabled = false;
        els.seedDataBtn.textContent = 'Seed Demo Data';
      }
    },
    openClearModal() {
      UI.setModalOpen(true);
    },
    closeClearModal() {
      UI.setModalOpen(false);
    },
    async clearAllData() {
      try {
        await Store.deleteAllTransactions();
        App.state.transactions = [];
        App.state.editingId = null;
        if (UI.chart) { UI.chart.destroy(); UI.chart = null; }
        App.closeClearModal();
        App.pushAlert("All transactions cleared");
        App.cancelEdit();
        App.render();
      } catch (err) {
        UI.showToast("Clear failed: " + err.message);
        App.closeClearModal();
      }
    },
    render() {
      const filtered = Analytics.getFiltered(
        App.state.transactions,
        App.state.filter,
      );
      const totals = Analytics.totals(filtered);
      const categoryTotals = Analytics.expensesByCategory(filtered);
      const topCategory = Analytics.getTopCategory(categoryTotals);
      const insights = AIEngine.generateInsights(App.state.transactions);
      const trend = Analytics.spendingTrend(App.state.transactions);
      const monthlyExpensesByCategory = Analytics.expensesByCategory(
        Analytics.monthlyBreakdown(App.state.transactions).currentMonth,
      );
      const healthScore = Analytics.healthScore(
        App.state.transactions,
        App.state.budgets,
        App.state.recurring,
      );
      const streak = Analytics.activityStreak(App.state.transactions);
      const accountBalances = Analytics.accountBalances(App.state.transactions);
      UI.setCurrency(els.totalBalance, totals.balance);
      UI.setCurrency(els.totalIncome, totals.income);
      UI.setCurrency(els.totalExpense, totals.expense);
      UI.setCurrency(els.balanceCash, accountBalances.cash);
      UI.setCurrency(els.balanceUpi, accountBalances.upi);
      UI.setCurrency(els.balanceBank, accountBalances.bank);
      UI.setCurrency(els.balanceCard, accountBalances.card);
      UI.updateCards(totals, topCategory);
      UI.updateTrendChip(trend);
      UI.updateHealth(healthScore, streak);
      els.topCategory.classList.remove("pulse");
      void els.topCategory.offsetWidth;
      els.topCategory.classList.add("pulse");
      UI.updateSummary(filtered, totals, App.state.filter);
      UI.updateInsights(insights);
      UI.renderTransactions(filtered);
      UI.renderBudgets(App.state.budgets, monthlyExpensesByCategory);
      UI.renderRecurring(App.state.recurring);
      UI.renderAlerts(App.state.alerts);
      UI.renderChart(
        categoryTotals,
        App.state.theme,
        App.state.chartType,
      );
      App.runBudgetAlerts(monthlyExpensesByCategory);
      App.runRecurringAlerts();
    },
  };

  window.__clearUserData = () => App.clearUserData();
  window.__loadUserData = () => App.loadUserData();

  (async () => {
    await window.__authReady;
    await App.init();
  })();
})();