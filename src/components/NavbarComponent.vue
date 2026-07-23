<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ElButton, ElLink, ElSpace, ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus'

import { useUserStore } from '@/stores/user'

const userSotre = useUserStore()
</script>

<template>
  <div class="navbar-container flex min-h-12 items-center border-b border-gray-300">
    <div class="logo">Sandcastle</div>

    <div class="ml-auto">
      <el-dropdown class="flex items-center" v-if="userSotre.isLogin">
        <div class="text-base">欢迎, {{ userSotre.userInfo?.username }}</div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>退出登录 </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-space size="large" v-else>
        <!-- <p>欢迎, {{ userSotre.userInfo?.username }}</p> -->
        <router-link to="/login">
          <el-link> 登录 </el-link>
        </router-link>

        <router-link to="/register">
          <el-button type="primary">注册</el-button>
        </router-link>
      </el-space>
    </div>
  </div>
</template>

<style></style>
