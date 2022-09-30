const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      { path: "", component: () => import("pages/IndexPage.vue"), name: "mp" },
      {
        path: "io",
        component: () => import("pages/ImmissionsortPage.vue"),
        name: "io",
      },
      {
        path: "mete",
        component: () => import("pages/MetePage.vue"),
        name: "mete",
      },
      {
        path: "map",
        component: () => import("pages/KartePage.vue"),
        name: "map",
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
