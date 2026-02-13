import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [vue(),
  visualizer({
    open: true,      // 构建后自动打开报告
    filename: 'dist/report.html', // 输出位置
    gzipSize: true,  // 显示 gzip 体积
    brotliSize: true // 显示 brotli 体积
  })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
  },
  server: {
    // host: '0.0.0.0',
    host:'10.3.20.101',
    port: 5173,
  },
  // **添加以下 build 配置**
  build: {
    cssCodeSplit: true,
    sourcemap: true, // 生产环境禁用 source map
    chunkSizeWarningLimit: 1500,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,// 生产环境时移除所有 console.* 语句
        drop_debugger: true,// 移除所有 debugger 语句
      },
      // 保留类名和函数名，方便排查问题（可选）
      // keep_classnames: true, 
      // keep_fnames: true
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  },
})