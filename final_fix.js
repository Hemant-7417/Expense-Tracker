const fs = require('fs');
let app = fs.readFileSync('app.js', 'utf8');

const brokenStr = `          loadRecurring() {
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
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
          accountBalances(transactions) {`;

const fixedStr = `          loadRecurring() {
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.RECURRING);
              const parsed = raw ? JSON.parse(raw) : [];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          },
          saveRecurring(recurring) {
            localStorage.setItem(
              STORAGE_KEYS.RECURRING,
              JSON.stringify(recurring),
            );
          },
          loadAlerts() {
            try {
              const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
              const parsed = raw ? JSON.parse(raw) : [];
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          },
          saveAlerts(alerts) {
            localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
          },
        };

        const API_URL = "http://localhost:5000/api";
        const API = {
          AI: {
            async parseSms(sms) {
              const res = await fetch(\`\${API_URL}/ai/parse-sms\`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sms })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to parse SMS");
              return data;
            },
            async getInsights(transactions) {
              const res = await fetch(\`\${API_URL}/ai/insights\`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transactions })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to get insights");
              return data;
            },
            async chat(message, history, transactions) {
              const res = await fetch(\`\${API_URL}/ai/chat\`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message, history, transactions })
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Failed to chat");
              return data;
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
          accountBalances(transactions) {`;

if (app.includes(brokenStr)) {
    app = app.replace(brokenStr, fixedStr);
    fs.writeFileSync('app.js', app);
    console.log("FIXED!");
} else {
    console.log("STRING NOT FOUND!");
}
