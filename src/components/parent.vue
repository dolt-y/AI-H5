<template>
    <div class="parent">
        <button @click="() => name = '李四'">父组件</button>
        <Child :name="name"></Child>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Child from './children.vue'

const name = ref('张三')

</script>
<style scoped>  
.parent {
    width: 400px;
    height: 400px;
    background-color: yellowgreen;
    padding: 20px;
}
</style>
