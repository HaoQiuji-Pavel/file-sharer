const WebSocket = require('ws');

const server = new WebSocket.Server({ port: 8081 });

const clients = new Map();

server.on('connection', (socket) => {
    console.log('New connection', new Date().toISOString());

    // 监听客户端发送的消息
    socket.on('message', (message) => {
        const { type, peerId, targetId, data } = JSON.parse(message);

        if (type === 'register') {
            clients.set(peerId, socket);
            console.log(`Peer registered: ${peerId}`);
        } else if (type === 'signal' && clients.has(targetId)) {
            const targetSocket = clients.get(targetId);
            console.log('转发', data);
            targetSocket.send(JSON.stringify({ type: 'signal', peerId, data }));
        }
    });

    socket.on('close', () => {
        for (const [peerId, clientSocket] of clients.entries()) {
            if (clientSocket === socket) {
                clients.delete(peerId);
                console.log(`Peer disconnected: ${peerId}`);
            }
        }
    });
});

console.log('Signaling server running on ws://localhost:8081');