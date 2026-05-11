// we'll try native fetch if it's node 18+

async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Hello', history: [], transactions: [] })
        });
        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);
    } catch (err) {
        console.error('Error:', err);
    }
}
test();
