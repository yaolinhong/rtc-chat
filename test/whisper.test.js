const { whisper } = require('whisper-node');
const fs = require('fs');
const path = require('path');

// 创建一个测试音频文件
const testAudioPath = path.join(__dirname, '16.wav');
const testAudioContent = "Hello, how are you?"; // 测试语音内容

async function processAudio(filePath) {
    try {
      const options = {
        modelName: "base.en",
        whisperOptions: {
          language: 'en',
          word_timestamps: true
        }
      };
      
      const result = await whisper(filePath, options);
      return result;
    } catch (err) {
      console.error('语音识别错误:', err);
      return '识别错误';
    }
  }
// 主测试函数
async function testWhisperFlow() {
  try {
    // 加载音频文件
    const audioBuffer = fs.readFileSync(testAudioPath);
    console.log('音频文件加载成功');

    // 调用processAudio函数进行转录
    const result = await processAudio(testAudioPath);
    console.log('转录结果:', result);

    // 提取所有转录段落
    const transcriptSegments = result.map(segment => segment.speech);
    const fullText = transcriptSegments.join(' ').trim();
    
    // 验证结果
    if (fullText !== '') {
      console.log('完整转录文本:', fullText);
      
      // 验证文本内容是否正确
      const expectedText = "I know, I know."; // 更新为实际预期的文本
      const isMatch = fullText.toLowerCase().includes(expectedText.toLowerCase());
      console.log(`文本匹配结果：${isMatch}`);
      return isMatch;
    }
    console.log('转录失败');
    return false;
  } catch (err) {
    console.error('测试失败:', err);
    return false;
  }
}

// 清理测试文件
async function cleanup() {
  try {
    await fs.promises.unlink(testAudioPath);
    console.log('测试文件已删除');
  } catch (err) {
    console.error('删除测试文件失败:', err);
  }
}

// 主程序
async function main() {
  try {
    // await initTestAudio();
    const success = await testWhisperFlow();
    if (success) {
      console.log('Whisper测试成功');
    } else {
      console.log('Whisper测试失败');
    }
  } catch (err) {
    console.error('主程序错误:', err);
  } finally {
    // await cleanup();
  }
}

// 运行测试
main();