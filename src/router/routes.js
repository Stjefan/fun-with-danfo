import { useCounterStore } from "../stores/example-store";

const routes = [
  {
    path: "",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/SettingsPage.vue"),
        name: "ts",
        meta: { requiresProject: false },
      },
      {
        path: "/mp",
        component: () => import("pages/TimescaleMesspunkt.vue"),
        name: "mp",
        meta: { requiresProject: true },
      },
      {
        path: "/io",
        component: () => import("pages/TimescaleLr.vue"),
        name: "io",
        meta: { requiresProject: true },
      },
      {
        path: "/mete",
        component: () => import("pages/TimescaleMete.vue"),
        name: "mete",
        meta: { requiresProject: true },
      },
      {
        path: "/map",
        component: () => import("pages/KartePage.vue"),
        name: "map",
        meta: { requiresProject: true },
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
