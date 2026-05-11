async function test() {
    for(let i=0; i<3; i++) {
        try {
            const res = await fetch('http://localhost:5000/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hello', history: [], transactions: [] })
            });
            const data = await res.json();
            console.log(`Attempt ${i+1}: Status:`, res.status, 'Response:', data);
        } catch (err) {
            console.error(`Attempt ${i+1} Error:`, err.message);
        }
    }
}
test();
