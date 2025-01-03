import './styles.css';

// 定义每个文件分片的大小
const CHUNK_SIZE = 16 * 1024; // 16 KB

// 创建 RTCPeerConnection 实例并注册 ICE 候选者监听
let peerConnection = new RTCPeerConnection();
let targetPeerId = null;

peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        signalingSocket.send(
            JSON.stringify({
                type: 'signal',
                peerId: localPeerId,
                targetId: targetPeerId, // targetPeerId 需要根据上下文动态设置
                data: event.candidate,
            })
        );
        console.log('发送 ICE 候选者:', event.candidate);
    } else {
        console.log('所有 ICE 候选者已收集完成');
    }
};
let dataChannel;
let signalingSocket;
const localPeerId = Math.random().toString(36).substring(7); // 随机生成唯一 Peer ID

// 被动监听对方的 DataChannel
peerConnection.ondatachannel = (event) => {
  console.log('接收到远端 DataChannel');
  dataChannel = event.channel;

  // 监听 DataChannel 状态变化
  dataChannel.onopen = () => console.log('DataChannel 已打开');
  dataChannel.onmessage = handleFileReceive; // 处理接收的文件分片
};

// 文件接收缓存
let receivedChunks = [];
let fileMetadata = null;

function handleFileReceive(event) {

    if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        // 接收到文件元数据
        fileMetadata = message.metadata;
        receivedChunks = [];
        console.log('接收到文件元数据:', fileMetadata);
    } else{
        // 接收到文件分片
        receivedChunks.push(event.data);
        console.log(`接收到分片 ${receivedChunks.length} / ${fileMetadata.totalChunks}`);
        console.log('接收到分片:', event.data);
        
        // 检查是否接收完成
        if (receivedChunks.length === fileMetadata.totalChunks) {
            const blob = new Blob(receivedChunks, { type: fileMetadata.type });
            const url = URL.createObjectURL(blob);

            // 创建下载链接
            const link = document.createElement('a');
            link.href = url;
            link.download = fileMetadata.name;
            link.textContent = `下载文件: ${fileMetadata.name}`;
            document.body.appendChild(link);

            console.log('文件接收完成！');
        }
    }
}

// 初始化信令连接
function initSignaling(signalServerId) {
    signalingSocket = new WebSocket('ws://'+signalServerId); // 连接到信令服务器
    console.log('Connecting to signaling server...', new Date().toISOString());
    
    // websocket客户端和服务器连接成功时触发
    signalingSocket.onopen = () => {
        signalingSocket.send(JSON.stringify({ type: 'register', peerId: localPeerId }));
        console.log(`Registered with signaling server as ${localPeerId}`);
    };
    // websocket客户端接收到服务器发送的消息时触发
    signalingSocket.onmessage = async (event) => {
        
        const { type, peerId, data } = JSON.parse(event.data);

        console.log('接收信令服务器消息', type, peerId, data);
        
        if (type === 'signal') {
            if (data.type === 'offer') {
                // 接收到 Offer，创建 Answer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                signalingSocket.send(
                    JSON.stringify({
                        type: 'signal',
                        peerId: localPeerId,
                        targetId: peerId,
                        data: answer,
                    })
                );
                console.log('Sent Answer');
            } else if (data.type === 'answer') {
                // 接收到 Answer
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
                console.log('Received Answer');
            } else if (data.candidate) {
                // 接收到 ICE 候选者
                await peerConnection.addIceCandidate(new RTCIceCandidate(data));
                console.log('Added ICE Candidate');
            }
        }
    };
}

// 初始化 WebRTC 连接
function initConnection(targetPeerId) {;
    // // 创建 DataChannel（用于发送文件）
    dataChannel = peerConnection.createDataChannel('fileTransfer');
    dataChannel.onopen = () => console.log('DataChannel opened');
    dataChannel.onmessage = handleFileReceive;

    // 创建 Offer 并发送给目标 Peer
    peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        signalingSocket.send(
            JSON.stringify({
                type: 'signal',
                peerId: localPeerId,
                targetId: targetPeerId,
                data: offer,
            })
        );
        console.log('发送offer sdp');
    });
}

// 事件绑定
document.getElementById('startConnection').addEventListener('click', () => {
    targetPeerId = prompt('Enter the target Peer ID:');
    initConnection(targetPeerId);
});
document.getElementById('startSignaling').addEventListener('click', () => {
  const signalServerId = prompt('Enter the signal server ID:');
  initSignaling(signalServerId);
});
document.getElementById('test').addEventListener('click', () => {
  // debugger;
  console.log('test');
  console.log('test2');
});

// 文件传输事件绑定
document.getElementById('fileInput').addEventListener('change', (event) => {
  const file = event.target.files[0];
    if (dataChannel && dataChannel.readyState === 'open') {
        console.log('开始传输文件:', file.name);

        // 发送文件元数据
        const metadata = {
            name: file.name,
            size: file.size,
            type: file.type,
            totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        };
        dataChannel.send(JSON.stringify({ type: 'metadata', metadata }));

        // 分片传输文件
        let offset = 0;
        const reader = new FileReader();

        reader.onload = () => {
          console.log('redear.result', reader.result);
          
          dataChannel.send(reader.result); // 直接发送 ArrayBuffer
            offset += CHUNK_SIZE;

            if (offset < file.size) {
                readNextChunk();
            } else {
                console.log('文件传输完成');
            }
        };

        function readNextChunk() {
            const slice = file.slice(offset, offset + CHUNK_SIZE);
            reader.readAsArrayBuffer(slice);
        }

        readNextChunk();
    } else {
        console.error('DataChannel 未就绪，无法传输文件');
    }
});