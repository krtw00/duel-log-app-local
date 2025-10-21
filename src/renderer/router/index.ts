import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import DecksView from '../views/DecksView.vue'
import StatisticsView from '../views/StatisticsView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: DashboardView
  },
  {
    path: '/decks',
    name: 'Decks',
    component: DecksView
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: StatisticsView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
