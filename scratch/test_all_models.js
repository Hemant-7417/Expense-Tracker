require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelsToTry = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
        "gemini-2.5-pro",
    ];

    for (const modelName of modelsToTry) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const chat = model.startChat({ history: [] });
            const result = await chat.sendMessage("Hello, return 'OK' if you can read this.");
            console.log(`✅ SUCCESS for ${modelName}:`, result.response.text());
        } catch (error) {
            console.log(`❌ FAILED for ${modelName}: ${error.status} ${error.statusText}`);
        }
    }
}

testModels();
