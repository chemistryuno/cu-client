import { createRouter, createWebHashHistory, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { OFFLINE_MODE } from './utils/runtimeConfig'
import { ensureAuthReady, getSafeInternalRedirect, getStoredUser, rememberPendingAuthRedirect } from './utils/authSession'

const Login = () => import('./pages/Login.vue')
const Lobby = () => import('./pages/Lobby.vue')
const GameRoom = () => import('./pages/GameRoom.vue')
const Profile = () => import('./pages/Profile.vue')
const Reactions = () => import('./pages/Reactions.vue')
const DataConfig = () => import('./pages/DataConfig.vue')
const Substances = () => import('./pages/Substances.vue')
const ReplayRoom = () => import('./pages/ReplayRoom.vue')

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guestOnly: true }
  },
  {
    path: '/',
    name: 'Lobby',
    component: Lobby,
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
    redirect: '/profile/settings'
  },
  {
    path: '/settings',
    redirect: '/profile/settings'
  },
  {
    path: '/profile/:tab',
    name: 'ProfileTab',
    component: Profile,
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
