<template>
    <div class="children">
        <p>{{ name }}</p>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance } from 'vue';

const props = withDefaults(defineProps<{
    name: string;
}>(), {
    name: 'This is the children component'
});
const instance = getCurrentInstance();

console.log('子组件的代理上下文',instance)
</script>
<style scoped>
.children {
    background-color: #f2f2f2;
    padding: 20px;
}
</style>