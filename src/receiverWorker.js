self.onmessage = (event) => {
  const { type, fileName, chunk, totalChunks, currentChunk } = event.data;

  if (type === 'chunk') {
      if (!self.fileState) self.fileState = {};
      if (!self.fileState[fileName]) {
          self.fileState[fileName] = {
              chunks: new Array(totalChunks),
              receivedChunks: 0,
          };
      }

      const fileState = self.fileState[fileName];
      fileState.chunks[currentChunk - 1] = chunk; // 保存块数据
      fileState.receivedChunks++;

      self.postMessage({
          type: 'progress',
          fileName,
          progress: fileState.receivedChunks / totalChunks,
      });

      if (fileState.receivedChunks === totalChunks) {
          const blob = new Blob(fileState.chunks); // 拼接文件
          self.postMessage({ type: 'complete', fileName, blob }); // 文件接收完成
      }
  }
};