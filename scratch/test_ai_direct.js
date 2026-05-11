require('dotenv').config();
const aiController = require('../controllers/aiController');

async function test() {
    const req = {
        body: {
            message: 'Hello',
            history: [],
            transactions: []
        }
    };
    const res = {
        status: (code) => {
            console.log('Status:', code);
            return {
                json: (data) => console.log('JSON:', data)
            };
        }
    };
    
    // override console.error to print full error stack
    const oldError = console.error;
    console.error = (...args) => {
        oldError('Intercepted Error:', ...args);
    };

    await aiController.chat(req, res);
}

test();
