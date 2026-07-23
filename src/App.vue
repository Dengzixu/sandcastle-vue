<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { RouterView } from 'vue-router'
import { ElConfigProvider, ElContainer, ElHeader, ElMain } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import { useUserStore } from './stores/user.ts'
import UserApi from './api/UserApi.ts'

const userSotre = useUserStore()
const userApi = new UserApi(import.meta.env.VITE_SANDCASTLE_API as string)

onBeforeMount(() => {
  console.log('token: ' + userSotre.token)

  userApi
    .verifyToken(userSotre.token)
    .then((response) => {
      return response.json()
    })
    .then((body) => {
      if (body?.user?.uuid !== userSotre.userInfo?.uuid) {
        userSotre.$reset()
      }
    })
})

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
