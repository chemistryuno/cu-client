import { createRouter, createWebHashHistory, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { OFFLINE_MODE } from './utils/runtimeConfig'
import { ensureAuthReady, getSafeInternalRedirect, getStoredUser, rememberPendingAuthRedirect } from './utils/authSession'

const Login = () => import('./pages/Login.vue')
const Register = () => import('./pages/Register.vue')
const Lobby = () => import('./pages/Lobby.vue')
const GameRoom = () => import('./pages/GameRoom.vue')
const Profile = () => import('./pages/Profile.vue')
const Plugins = () => import('./pages/Plugins.vue')
const Reactions = () => import('./pages/Reactions.vue')
const Feedbacks = () => import('./pages/Feedbacks.vue')
const Survey = () => import('./pages/Survey.vue')
const DataConfig = () => import('./pages/DataConfig.vue')
const Substances = () => import('./pages/Substances.vue')
const Chat = () => import('./pages/Chat.vue')
const UserSpace = () => import('./pages/UserSpace.vue')
const ReplayRoom = () => import('./pages/ReplayRoom.vue')
const OAuthCallback = () => import('./pages/OAuthCallback.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guestOnly: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guestOnly: true }
  },
  {
    path: '/',
    name: 'Lobby',
    component: Lobby,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/room/:id',
    name: 'GameRoom',
    component: GameRoom,
    meta: { requiresAuth: true }
  },
  {
    path: '/replay/:historyId',
    name: 'ReplayRoom',
    component: ReplayRoom,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile/:tab',
    name: 'ProfileTab',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/feedbacks',
    name: 'Feedbacks',
    component: Feedbacks,
    meta: { requiresAuth: true }
  },
  {
    path: '/surveys/:id',
    name: 'Survey',
    component: Survey,
    meta: { requiresAuth: true }
  },
  {
    path: '/feedbacks/my',
    redirect: '/feedbacks'
  },
  {
    path: '/plugins',
    name: 'Plugins',
    component: Plugins,
    meta: { requiresAuth: true }
  },
  {
    path: '/data',
    name: 'DataConfig',
    component: DataConfig,
    meta: { requiresAuth: true }
  },
  {
    path: '/data/reactions',
    name: 'Reactions',
    component: Reactions,
    meta: { requiresAuth: true }
  },
  {
    path: '/data/substances',
    name: 'Substances',
    component: Substances,
    meta: { requiresAuth: true }
  },
  {
    path: '/user/:uid',
    name: 'UserSpace',
    component: UserSpace,
    meta: { requiresAuth: true }
  },
  {
    // OAuth 降级回调页：当 window.opener 不可用时，后端将 token 通过 URL hash 重定向至此
    path: '/oauth-callback',
    name: 'OAuthCallback',
    component: OAuthCallback
  }
]

const router = createRouter({
  history: OFFLINE_MODE ? createWebHashHistory() : createWebHistory(),
  routes
})

router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized) => {
  await ensureAuthReady()
  const user = getStoredUser()

  if (to.meta.requiresAuth && !user) {
    rememberPendingAuthRedirect(to.fullPath)
    return {
      path: '/login',
      query: { redirect: to.fullPath }
    }
  } else if (to.meta.guestOnly && user) {
    return getSafeInternalRedirect(to.query.redirect, '/')
  }

  return true
})

export default router
