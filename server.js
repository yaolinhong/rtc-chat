const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const { whisper } = require('whisper-node');  // 直接引用whisper-node
console.log(whisper, "whisper");
const axios = require('axios');
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const wav = require('wav');  // 使用wav包代替
const lame = require('lame');

// IMPORTANT: Audio files must be in .wav format and 16-bit sample rate
// This warning should be clear to users

// 配置静态文件目录
app.use(express.static('public'));

// Add route for index.html
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// 删除未使用的multer配置
// app.post('/upload', upload.single('audio'), async (req, res) => {
//   // ... existing code ...
// });

// 删除未使用的transcribeAudio函数
// async function transcribeAudio(filePath) {
//   // ... existing code ...
// }

async function processAudio(filePath) {
  try {
    const options = {
      modelName: "base.en",
      whisperOptions: {
        language: 'auto',
        word_timestamps: true
      }
    };
    
    const result = await whisper(filePath, options);
    
    // 添加结果解析
    const parsedResult = parseTranscriptionResults(result);
    return parsedResult;
  } catch (err) {
    console.error('语音识别错误:', err);
    return { error: '识别错误', details: err.message };
  }
}

// 新增解析函数
function parseTranscriptionResults(result) {
  if (!result || !result.segments) {
    return { text: '', segments: [], metadata: {} };
  }

  // 提取所有段落的文本
  const fullText = result.segments.map(segment => segment.text).join(' ');
  
  // 提取时间戳信息
  const timedSegments = result.segments.map(segment => ({
    text: segment.text,
    start: segment.start,
    end: segment.end
  }));

  // 计算基本信息
  const metadata = {
    totalWords: fullText.split(/\s+/).length,
    duration: result.segments[result.segments.length - 1].end
  };

  return {
    fullText,
    segments: timedSegments,
    metadata
  };
}

io.on('connection', (socket) => {
  console.log('新客户端连接');

  socket.on('audio-data', async (data) => {
    console.log('接收到音频数据，大小为:', data.length);

    const tempFilePath = path.join(__dirname, 'uploads', 'temp.wav');
    try {
        const outputFileStream = new wav.FileWriter(tempFilePath, {
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16,
            codec: 'pcmS16'
        });

        const audioBuffer = Buffer.from(data);
        const audioData = new Int16Array(audioBuffer.buffer);
        const encoder = new lame.Encoder({
            bitRate: 128,
            sampleRate: 16000,
            channels: 1
        });

        // 将音频数据编码为MP3
        const encodedAudio = encoder.encodeBuffer(audioData);
        outputFileStream.write(encodedAudio);

        outputFileStream.on('finish', async () => {
            console.log('文件保存成功:', tempFilePath);
            const transcription = await processAudio(tempFilePath);
            console.log('发送回复:', transcription);
            socket.emit('audio-response', transcription);
        });

        outputFileStream.on('error', (err) => {
            console.error('写入失败:', err);
            socket.emit('audio-response', { error: '保存失败', details: err.message });
        });

        outputFileStream.end();
    } catch (err) {
        console.error('处理失败:', err);
        socket.emit('audio-response', { error: '识别失败', details: err.message });
    } finally {
        try {
            // await fsPromises.unlink(tempFilePath);
            console.log('临时文件已删除');
        } catch (err) {
            console.error('删除文件失败:', err);
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('客户端断开连接');
  });
});

server.listen(3000, () => {
  console.log('服务器启动在端口3000');
});

// // 示例：转录音频文件
// async function transcribeAudio(filePath) {
//     const result = await whisper.transcribe(filePath);
//     console.log(result.text);
// }

// // 调用函数
// transcribeAudio('path/to/your/audio.mp3'); 