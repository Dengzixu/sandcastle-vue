<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ElConfigProvider, ElContainer, ElHeader, ElMain } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import NavbarComponent from './components/NavbarComponent.vue'
</script>

<template>
  <el-config-provider :locale="zhCn">
    <el-container>
      <el-header>
        <NavbarComponent />
      </el-header>

      <el-main>
        <RouterView />
      </el-main>
    </el-container>
  </el-config-provider>
</template>

<style scoped></style>
