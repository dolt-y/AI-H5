import { ElMessage } from 'element-plus'

class NativeRecorder {
  audioContext = null;
  processor = null;
  stream = null;
  source = null;
  pcmData = [];

  async start() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasMic = devices.some(d => d.kind === "audioinput");

    if (!hasMic) {
      ElMessage.error("未检测到可用的麦克风设备");
      throw new Error("未检测到可用的麦克风设备");
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      ElMessage.error("无法访问麦克风，请检查权限");
      console.error("getUserMedia 错误:", err);
      throw err;
    }

    // 初始化音频处理
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000
    });

    this.source = this.audioContext.createMediaStreamSource(this.stream);

    // Edge / Safari createScriptProcessor 兼容处理
    this.processor =
      this.audioContext.createScriptProcessor?.(4096, 1, 1) ||
      this.audioContext.createJavaScriptNode?.(4096, 1, 1);

    if (!this.processor) {
      ElMessage.error("当前浏览器不支持音频处理节点");
      throw new Error("ScriptProcessorNode 不支持");
    }

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);

    // 收集 PCM
    this.processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      this.pcmData.push(new Float32Array(input));
    };

    console.log("录音开始");
  }

  async stop() {
    return new Promise((resolve) => {
      // 结束流
      if (this.stream) {
        this.stream.getTracks().forEach((t) => t.stop());
      }

      // 节点防御
      try {
        this.processor?.disconnect();
        this.source?.disconnect();
      } catch (e) { }

      let pcm = this.mergePCM(this.pcmData);
      let wavBlob = this.encodeWAV(pcm);

      // 清空缓存
      this.pcmData = [];

      resolve(wavBlob);
    });
  }

  // 合并多段 PCM
  mergePCM(chunks) {
    let total = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Float32Array(total);

    let offset = 0;
    chunks.forEach(c => {
      result.set(c, offset);
      offset += c.length;
    });

    return result;
  }

  // PCM → WAV
  encodeWAV(pcmData) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // format = PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, 16000, true);
    view.setUint32(28, 16000 * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, "data");
    view.setUint32(40, pcmData.length * 2, true);

    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  }
}

export default new NativeRecorder();
