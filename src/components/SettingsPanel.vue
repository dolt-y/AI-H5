<template>
    <div class="settings-wrapper">
        <!-- 设置按钮 - 汉堡菜单图标 -->
        <button class="settings-btn" @click="togglePanel" :class="{ active: isPanelOpen }" title="设置">
            <img src="@/assets/menu-hamburger.svg" alt="设置菜单" class="menu-icon" />
        </button>
        
        <!-- 半透明覆盖层 -->
        <transition name="fade">
            <div v-if="isPanelOpen" class="settings-overlay" @click="closePanel"></div>
        </transition>

        <!-- 侧边栏面板 -->
        <transition name="slide">
            <div v-if="isPanelOpen" class="settings-panel">
                <div class="settings-header">
                    <h2>设置</h2>
                    <button class="close-btn" @click="closePanel">
                        <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="1.5" stroke-linecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div class="settings-content">
                    <!-- 账户设置 -->
                    <div class="settings-section">
                        <h3 class="section-title">账户</h3>
                        <div class="setting-item">
                            <span class="setting-label">用户昵称</span>
                            <input v-model="nickname" type="text" class="setting-input" placeholder="输入昵称" />
                        </div>
                    </div>

                    <!-- 模型设置 -->
                    <div class="settings-section">
                        <h3 class="section-title">模型偏好</h3>
                        <div class="setting-item">
                            <span class="setting-label">默认模型</span>
                            <select v-model="defaultModel" class="setting-select">
                                <option value="deepseek-chat">快速问答</option>
                                <option value="deepseek-reasoner">深度思考</option>
                            </select>
                        </div>
                    </div>

                    <!-- 显示设置 -->
                    <div class="settings-section">
                        <h3 class="section-title">显示</h3>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">深色模式</span>
                            <label class="toggle-switch">
                                <input v-model="darkMode" type="checkbox" />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">显示代码行号</span>
                            <label class="toggle-switch">
                                <input v-model="showLineNumbers" type="checkbox" />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <!-- 其他设置 -->
                    <div class="settings-section">
                        <h3 class="section-title">其他</h3>
                        <div class="setting-item toggle-item">
                            <span class="setting-label">自动滚动</span>
                            <label class="toggle-switch">
                                <input v-model="autoScroll" type="checkbox" />
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="settings-footer">
                    <button class="save-btn" @click="saveSettings">保存设置</button>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isPanelOpen = ref(false);
const nickname = ref('');
const defaultModel = ref('deepseek-chat');
const darkMode = ref(false);
const showLineNumbers = ref(true);
const autoScroll = ref(true);

const emit = defineEmits(['update-settings']);

const togglePanel = () => {
    isPanelOpen.value = !isPanelOpen.value;
};

const closePanel = () => {
    isPanelOpen.value = false;
};

const saveSettings = () => {
    const settings = {
        nickname: nickname.value,
        defaultModel: defaultModel.value,
        darkMode: darkMode.value,
        showLineNumbers: showLineNumbers.value,
        autoScroll: autoScroll.value,
    };

    // 保存到本地存储
    localStorage.setItem('appSettings', JSON.stringify(settings));

    // 发送更新事件
    emit('update-settings', settings);

    // 显示保存成功提示
    closePanel();
    // 可以在这里添加一个toast提示
    console.log('设置已保存');
};

const loadSettings = () => {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        nickname.value = settings.nickname || '';
        defaultModel.value = settings.defaultModel || 'deepseek-chat';
        darkMode.value = settings.darkMode || false;
        showLineNumbers.value = settings.showLineNumbers !== undefined ? settings.showLineNumbers : true;
        autoScroll.value = settings.autoScroll !== undefined ? settings.autoScroll : true;
    }
};

onMounted(() => {
    loadSettings();
});
</script>

<style scoped lang="scss">
.settings-wrapper {
    position: fixed;
    top: 0rem;
    left: 0rem;
    z-index: 100;
}

.settings-btn {
    width: 2rem;
    height: 2rem;
    // background: linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-accent-strong, #8b5cf6));
    border: none;
    // border-radius: 0.6rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0.33rem 1rem rgba(99, 102, 241, 0.25);
    position: relative;
    overflow: hidden;

    .menu-icon {
        width: 1rem;
        height: 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 0 0 transparent);
    }

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.15), transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &:hover {
        transform: translateY(-0.17rem);
        box-shadow: 0 0.5rem 1.5rem rgba(99, 102, 241, 0.35);

        .menu-icon {
            transform: scale(1.1);
        }

        &::before {
            opacity: 1;
        }
    }

    &.active {
        background: linear-gradient(135deg, var(--color-accent-strong, #8b5cf6), var(--color-accent-contrast, #ec4899));
        box-shadow: 0 0.5rem 1.67rem rgba(139, 92, 246, 0.4);

        .menu-icon {
            transform: scale(1.15) rotate(90deg);
        }
    }

    &:active {
        transform: translateY(-0.1rem) scale(0.98);
    }
}

.settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-overlay, rgba(15, 23, 42, 0.45));
    z-index: 200;
    animation: fadeIn 0.3s ease-in;

    @keyframes fadeIn {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }
}

.settings-panel {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 25rem;
    background: var(--color-bg-card, rgba(255, 255, 255, 0.95));
    box-shadow: 0.67rem 0 2.67rem rgba(0, 0, 0, 0.12);
    z-index: 250;
    display: flex;
    flex-direction: column;
    backdrop-filter: blur(10px);
    animation: slideInLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);

    @keyframes slideInLeft {
        from {
            transform: translateX(-100%);
        }

        to {
            transform: translateX(0);
        }
    }

    @media (max-width: 480px) {
        width: 100%;
    }
}

.settings-header {
    padding: 1rem 1.5rem;
    border-bottom: 0.083rem solid var(--color-border-subtle, rgba(218, 227, 255, 0.7));
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));

    h2 {
        margin: 0;
        font-size: 1.33rem;
        font-weight: 600;
        color: var(--color-text-primary, #273156);
    }

    .close-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.33rem;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary, rgba(39, 49, 86, 0.6));
        transition: all 0.2s ease;
        border-radius: 0.33rem;

        &:hover {
            color: var(--color-text-primary, #273156);
            background: rgba(99, 102, 241, 0.1);
            transform: rotate(90deg);
        }
    }
}

.settings-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.5rem;

    &::-webkit-scrollbar {
        width: 0.5rem;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.3));
        border-radius: 0.25rem;
        transition: all 0.2s ease;

        &:hover {
            background: linear-gradient(180deg, rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.5));
        }
    }
}

.settings-section {
    margin-bottom: 1.33rem;

    &:last-child {
        margin-bottom: 0;
    }

    .section-title {
        margin: 0 0 0.67rem 0;
        font-size: 0.83rem;
        font-weight: 700;
        color: var(--color-accent, #6366f1);
        text-transform: uppercase;
        letter-spacing: 0.05rem;
        opacity: 0.85;
    }
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
    background: var(--color-bg-soft, rgba(244, 246, 255, 0.92));
    border-radius: 0.5rem;
    transition: all 0.2s ease;
    margin-bottom: 0.5rem;

    &:last-child {
        margin-bottom: 0;
    }

    &:hover {
        background: var(--color-bg-elevated, rgba(255, 255, 255, 0.98));
        box-shadow: 0 0.17rem 0.5rem rgba(99, 102, 241, 0.08);
    }

    .setting-label {
        font-size: 0.92rem;
        color: var(--color-text-primary, #273156);
        font-weight: 500;
    }
}

.setting-input,
.setting-select {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 0.083rem solid var(--color-border-soft, rgba(197, 210, 255, 0.6));
    border-radius: 0.42rem;
    background: white;
    color: var(--color-text-primary, #273156);
    font-size: 0.92rem;
    transition: all 0.2s ease;
    box-shadow: inset 0 0.083rem 0.25rem rgba(0, 0, 0, 0.05);

    &:focus {
        outline: none;
        border-color: var(--color-accent, #6366f1);
        background: white;
        box-shadow: inset 0 0.083rem 0.25rem rgba(0, 0, 0, 0.05), 0 0 0 0.25rem rgba(99, 102, 241, 0.1);
    }

    &::placeholder {
        color: var(--color-text-secondary, rgba(39, 49, 86, 0.6));
    }
}

.toggle-item {
    justify-content: space-between;

    .setting-label {
        flex: 0;
    }
}

.toggle-switch {
    position: relative;
    display: inline-block;
    width: 4rem;
    height: 2.17rem;
    cursor: pointer;

    input {
        display: none;

        &:checked+.toggle-slider {
            background: linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-accent-strong, #8b5cf6));
            box-shadow: inset 0 0.17rem 0.33rem rgba(0, 0, 0, 0.1), 0 0.17rem 0.67rem rgba(99, 102, 241, 0.2);

            &::before {
                transform: translateX(1.83rem);
            }
        }
    }

    .toggle-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--color-border-soft, rgba(197, 210, 255, 0.6));
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1.08rem;
        box-shadow: inset 0 0.083rem 0.25rem rgba(0, 0, 0, 0.08);

        &::before {
            position: absolute;
            content: '';
            height: 1.83rem;
            width: 1.83rem;
            left: 0.17rem;
            bottom: 0.17rem;
            background-color: white;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 50%;
            box-shadow: 0 0.17rem 0.33rem rgba(0, 0, 0, 0.12);
        }
    }
}

.settings-footer {
    padding: 1rem 1.5rem;
    border-top: 0.083rem solid var(--color-border-subtle, rgba(218, 227, 255, 0.7));
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.03), rgba(139, 92, 246, 0.03));

    .save-btn {
        width: 100%;
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, var(--color-accent, #6366f1), var(--color-accent-strong, #8b5cf6));
        color: white;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0.33rem 1rem rgba(99, 102, 241, 0.25);
        position: relative;
        overflow: hidden;

        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        &:hover {
            transform: translateY(-0.17rem);
            box-shadow: 0 0.67rem 2rem rgba(99, 102, 241, 0.4);

            &::before {
                opacity: 1;
            }
        }

        &:active {
            transform: translateY(0);
            box-shadow: 0 0.33rem 1rem rgba(99, 102, 241, 0.3);
        }
    }
}

// 动画过渡
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-enter-from {
    transform: translateX(-100%);
}

.slide-leave-to {
    transform: translateX(-100%);
}
</style>
