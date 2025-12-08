// src/hooks/chat/useChatRecording.ts
// 语言转文字部分的hook逻辑
import { ref } from "vue";
export function useChatRecording() {

    const isRecording = ref<boolean>(false);// 是否正在录音
    const recordingDuration = ref<number>(0);// 录音时长
    const isCancel = ref(false);

    let recordingTimer: number | null = null;
    function handleStartRecording() { // 开始录音
        if (isRecording.value) return;
        isRecording.value = true;
        recordingDuration.value = 0;
        isCancel.value = false;
        recordingTimer = setInterval(() => {
            recordingDuration.value += 1;
        }, 1000);
    }
    function stopRecording() { // 停止录音
        if (!isRecording.value) return;
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        isRecording.value = false;
        recordingDuration.value = 0;
        isCancel.value = false;
    }

    function handleStopRecording() { // 取消录音
        isCancel.value = true;
        stopRecording();
    }
    return {
        isRecording,
        recordingDuration,
        isCancel,
        handleStartRecording,
        handleStopRecording,
        stopRecording,
    };
}