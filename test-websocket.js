const WebSocket = require('ws');

const ws = new WebSocket('wss://site--jupiter-system--6qtwyp8fx6v7.code.run');

ws.on('open', () => {
  console.log('Connected to server');
  
  // 登録メッセージを送信
  ws.send(JSON.stringify({
    type: 'register',
    client_type: 'test_client',
    version: '1.0.0'
  }));
  
  // 5秒後に消去通知を送信
  setTimeout(() => {
    console.log('Sending dismiss notification...');
    ws.send(JSON.stringify({
      type: 'dismiss_notification',
      client_type: 'test_client'
    }));
  }, 5000);
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('error', (error) => {
  console.error('Error:', error);
});

ws.on('close', () => {
  console.log('Disconnected from server');
});