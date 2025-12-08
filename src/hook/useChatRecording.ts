// src/hooks/chat/useChatRecording.ts
// 语言转文字部分的hook逻辑
import { ref } from "vue";
export function useChatRecording() {

    const isRecording = ref<boolean>(false);// 是否正在录音
    const recordingDuration = ref<number>(0);// 录音时长
    const isCancel = ref(false);
    // 处理录音
    let recordingTimer: number | null = null;
    function handleStartRecording() {
        if (isRecording.value) return;
        isRecording.value = true;
        recordingDuration.value = 0;
        isCancel.value = false;
        recordingTimer = setInterval(() => {
            recordingDuration.value += 1;
        }, 1000);
    }
    function stopRecording() {
        if (!isRecording.value) return;
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        isRecording.value = false;
        recordingDuration.value = 0;
        isCancel.value = false;
    }

    function handleStopRecording() {
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