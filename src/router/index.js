import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import i18n from '@/i18n'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'Home',
        component: () => import('@/views/Home.vue'),
        meta: { titleKey: 'home.title' }
      },
      {
        path: 'upload',
        name: 'Upload',
        component: () => import('@/views/Upload.vue'),
        meta: { titleKey: 'nav.upload', requiresAuth: true }
      },
      {
        path: 'photos',
        name: 'Photos',
        component: () => import('@/views/Photos.vue'),
        meta: { titleKey: 'nav.myPhotos', requiresAuth: true }
      },
      {
        path: 'albums',
        name: 'Albums',
        component: () => import('@/views/Albums.vue'),
        meta: { titleKey: 'nav.myAlbums', requiresAuth: true }
      },
      {
        path: 'shares',
        name: 'Shares',
        component: () => import('@/views/Shares.vue'),
        meta: { titleKey: 'nav.myShares', requiresAuth: true }
      },
      {
        path: 'subscription',
        name: 'Subscription',
        component: () => import('@/views/Subscription.vue'),
        meta: { titleKey: 'nav.subscription', requiresAuth: true }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/Orders.vue'),
        meta: { titleKey: 'nav.orders', requiresAuth: true }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/OrderDetail.vue'),
        meta: { titleKey: 'nav.orders', requiresAuth: true }
      },
      {
        path: 'tickets',
        name: 'Tickets',
        component: () => import('@/views/Tickets.vue'),
        meta: { titleKey: 'nav.tickets', requiresAuth: true }
      },
      {
        path: 'tickets/:id',
        name: 'TicketDetail',
        component: () => import('@/views/TicketDetail.vue'),
        meta: { titleKey: 'nav.tickets', requiresAuth: true }
      },
      {
        path: 'tokens',
        name: 'Tokens',
        component: () => import('@/views/Tokens.vue'),
        meta: { titleKey: 'nav.tokens', requiresAuth: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { titleKey: 'nav.profile', requiresAuth: true }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
        meta: { titleKey: 'nav.settings' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  if (to.meta.titleKey) {
    document.title = `${i18n.global.t(to.meta.titleKey)} - ${i18n.global.t('app.name')}`
  }

  // 检查是否在登录/注册独立窗口中
  const isAuthPage = to.path === '/login' || to.path === '/register'
  const isFromAuthPage = from.path === '/login' || from.path === '/register'

  // 如果有 token 但没有用户信息，尝试获取
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 获取失败，清除 token
      userStore.logout()
    }
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    // 需要登录但未登录，在独立窗口中显示
    // 检查是否已经有认证窗口打开
    if (!isAuthPage && !isFromAuthPage) {
      window.electronAPI?.openAuthWindow?.('login')
      next(false) // 阻止路由跳转
    } else {
      next()
    }
  } else if (to.meta.requiresGuest && userStore.isLoggedIn) {
    // 已登录用户访问登录/注册页面，跳转到首页
    if (!isFromAuthPage) {
      next('/')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
