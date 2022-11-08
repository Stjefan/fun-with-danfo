import { useCounterStore } from "../stores/example-store";

const routes = [
  {
    path: "/:project/",
    beforeEnter: async (to, from) => {
      // reject the navigation
      console.log("BeforeEnter is called", to, from);
      console.log(to.params.project);
      const store = useCounterStore();
      console.log();
      console.log("Is store available?", store);
      try {
        ["mannheim", "immendingen", "debug"].includes(to.params.project);
        await store.setProject(to.params.project);
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    },
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/TimescaleFun.vue"),
        name: "ts",
      },
      {
        path: "bla",
        component: () => import("pages/TimescaleMesspunkt.vue"),
        name: "mp",
      },
      {
        path: "io",
        component: () => import("pages/TimescaleLr.vue"),
        name: "io",
      },
      {
        path: "mete",
        component: () => import("pages/TimescaleMete.vue"),
        name: "mete",
      },
      {
        path: "map",
        component: () => import("pages/KartePage.vue"),
        name: "map",
      },
      {
        path: "settings",
        component: () => import("pages/SettingsPage.vue"),
        name: "settings",
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
