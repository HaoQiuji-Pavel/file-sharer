self.onmessage = (event) => {
  const { type, file, chunkSize } = event.data;

  if (type === 'split') {
      const totalChunks = Math.ceil(file.size / chunkSize); // 计算总块数
      let offset = 0;

      const readChunk = () => {
          if (offset < file.size) {
              const slice = file.slice(offset, offset + chunkSize); // 读取文件块
              const reader = new FileReader();

              reader.onload = (e) => {
                  self.postMessage({
                      type: 'chunk',
                      fileName: file.name,
                      totalChunks,
                      currentChunk: Math.floor(offset / chunkSize) + 1,
                      data: e.target.result,
                  });
                  offset += chunkSize; // 更新偏移量
                  readChunk();
              };

              reader.readAsArrayBuffer(slice);
          } else {
              self.postMessage({ type: 'complete', fileName: file.name }); // 文件发送完成
          }
      };

      readChunk();
  }
};