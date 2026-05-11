const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini only if key exists
const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
};

exports.parseSms = async (req, res) => {
  try {
    const genAI = getGenAI();
    if (!genAI) return res.status(500).json({ error: "GEMINI_API_KEY is not configured in .env" });
    const { sms } = req.body;
    if (!sms) return res.status(400).json({ error: "SMS content is required" });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Extract transaction details from the following text (which could be a bank SMS or a spoken voice transcript): "${sms}".
      Return ONLY a JSON object (no markdown, no extra text) with the following keys:
      - amount (number, extract the numerical value)
      - description (string, usually the merchant, item, or context)
      - type (string, strictly "expense" or "income")
      - category (string, pick the closest from: food, travel, gaming, bills, shopping, others)
      - account (string, pick the closest from: cash, upi, bank, card)
      
      Instructions:
      - Be flexible. If the user says "I bought a coffee for 5 dollars" or "spent 50 on lunch", treat it as a valid expense.
      - If it doesn't look like a valid financial transaction at all, return {"error": "Could not understand the transaction details. Please try again."}.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^\`\`\`json/i, "").replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
    
    const parsed = JSON.parse(text);
    if (parsed.error) return res.status(400).json(parsed);
    
    res.status(200).json(parsed);
  } catch (error) {
    console.error("SMS Parsing Error:", error);
    const msg = error.status === 429 
      ? "Google AI Quota Exceeded (429). Please wait or check your API key plan." 
      : (error.status === 503 ? "AI Service is temporarily unavailable (503). Try again later." : "Failed to parse SMS using AI");
    res.status(error.status || 500).json({ error: msg });
  }
};

exports.getInsights = async (req, res) => {
  try {
    const genAI = getGenAI();
    if (!genAI) return res.status(500).json({ error: "GEMINI_API_KEY is not configured in .env" });
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions)) return res.status(400).json({ error: "Transactions array is required" });
    if (transactions.length === 0) return res.status(200).json(["📊 No transactions yet! Add some expenses or income to get AI-powered insights.", "💡 Try using the 'Seed Demo Data' button to see insights in action!", "🚀 Start tracking your spending and I'll analyze your patterns!"]);

    const summary = transactions.map(t => `${t.date} | ${t.type} | ₹${t.amount} | ${t.category} | ${t.account} | ${t.description}`).join("\\n");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an expert financial advisor AI. Here are the user's recent transactions:
      ${summary.substring(0, 5000)}
      
      Analyze their spending patterns and generate exactly 3 short, punchy, and highly actionable insights.
      CRITICAL: You MUST provide strong, specific suggestions on how to maximize savings and cut unnecessary expenses. Focus heavily on saving money.
      Use emojis. Keep each insight under 20 words.
      Return ONLY a JSON array of strings (no markdown, no other text).
      Example: ["🍔 You spent 40% on food. Cook at home to save ₹5000!", "💰 Move 20% of your income to a high-yield savings account today!"]
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    text = text.replace(/^\`\`\`json/i, "").replace(/^\`\`\`/, "").replace(/\`\`\`$/, "").trim();
    
    const insights = JSON.parse(text);
    res.status(200).json(insights);
  } catch (error) {
    console.error("AI Insights Error:", error);
    const msg = error.status === 429 
      ? "Google AI Quota Exceeded (429). Please wait or check your API key plan." 
      : (error.status === 503 ? "AI Service is temporarily unavailable (503). Try again later." : "Failed to generate AI insights");
    res.status(error.status || 500).json({ error: msg });
  }
};

exports.chat = async (req, res) => {
  try {
    const genAI = getGenAI();
    if (!genAI) return res.status(500).json({ error: "GEMINI_API_KEY is not configured in .env" });
    const { message, history, transactions } = req.body;
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    // Calculate totals server-side to ensure 100% accuracy for the AI
    const totals = (transactions || []).reduce((acc, t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === "income") acc.income += amt;
      else acc.expense += amt;
      return acc;
    }, { income: 0, expense: 0 });
    
    const balance = totals.income - totals.expense;
    const currentDate = new Date().toLocaleDateString('en-IN', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Sort transactions by date (newest first) and format cleanly
    const sortedTransactions = [...(transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    const summary = sortedTransactions
      .map(t => `${t.date} | ${t.type} | ${t.amount} | ${t.category} | ${t.account} | ${t.description}`)
      .join("\n")
      .substring(0, 4000);

    const fullPrompt = `
      System Context: You are a helpful, professional, and concise financial assistant for "Finance Tracker Pro". 
      Current Date: ${currentDate}
      
      User's Exact Financial Summary:
      - Total Income: ₹${totals.income}
      - Total Expense: ₹${totals.expense}
      - Current Balance: ₹${balance}
      
      Recent Transactions (Newest First):
      ${summary}
      
      User Message: ${message}
      
      Instructions:
      1. Use the "User's Exact Financial Summary" for any questions about totals. It is 100% accurate.
      2. Use the "Recent Transactions" list for specific details or category breakdowns.
      3. Respond directly and concisely (1-3 sentences). 
      4. Use an encouraging, professional tone with relevant emojis.
    `;

    const result = await chat.sendMessage(fullPrompt);
    res.status(200).json({ response: result.response.text() });
  } catch (error) {
    console.error("AI Chat Error:", error);
    const msg = error.status === 429 
      ? "API Rate Limit Exceeded. Please wait a minute and try again." 
      : (error.status === 503 ? "AI Service is temporarily unavailable. Try again later." : "Failed to communicate with AI Chatbot");
    res.status(500).json({ error: msg });
  }
};
