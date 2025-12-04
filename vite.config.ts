import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
  },
  server: {
    host: '0.0.0.0',
    // host:'10.3.20.101',
    port: 5173,
  },
  // **添加以下 build 配置**
  build: {
    sourcemap: true, // 生产环境禁用 source map
    // 确保使用 terser 进行压缩，这是默认选项，但明确指定更保险
    minify: 'terser',
    // 配置 terser 压缩选项
    terserOptions: {
      compress: {
        // 生产环境时移除所有 console.* 语句
        drop_console: true,
        // 移除所有 debugger 语句
        drop_debugger: true,
      },
      // 保留类名和函数名，方便排查问题（可选）
      // keep_classnames: true, 
      // keep_fnames: true
    },
  },
})