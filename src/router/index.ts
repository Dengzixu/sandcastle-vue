import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.ts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/user/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/user/RegisterView.vue'),
    },
    {
      path: '/file/:id',
      name: 'file',
      component: () => import('@/views/FileView.vue'),
    },
    {
      path: '/file/list',
      name: 'file-list',
      component: () => import('@/views/file/ListView.vue'),
      meta: {
        requireLogin: true,
      },
    },
  ],
})

router.beforeEach((to, from) => {
  const userStore = useUserStore()
  if (to.meta.requireLogin && !userStore.isLogin) {
    return {
      path: '/login',
      // 保存我们所在的位置，以便以后再来
      query: { redirect: to.fullPath },
    }
  }
})

export default router
