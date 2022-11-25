<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> {{ shownTitle }}</q-toolbar-title>

        <div>v 2022-11a</div>
      </q-toolbar>
    </q-header>
    <!--
    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Dashboards </q-item-label>
        <q-list>
          <q-item clickable v-ripple :to="{ name: 'mp' }"
            ><q-item-section> Messpunkte </q-item-section></q-item
          >
          <q-item clickable v-ripple :to="{ name: 'io' }"
            >Immissionsorte</q-item
          >
          <q-item
            clickable
            v-ripple
            v-if="store.showMete"
            :to="{ name: 'mete' }"
            >Wetter</q-item
          >
          <q-item clickable v-ripple :to="{ name: 'map' }">Karte</q-item>
        </q-list>
      </q-list>
    </q-drawer>
    -->
    <q-page-container>
      <q-tabs align="center">
        <q-route-tab label="Messpunkte" :to="{ name: 'mp' }" exact />
        <q-route-tab label="Immissionsorte" :to="{ name: 'io' }" exact />
        <q-route-tab
          label="Wetter"
          :to="{ name: 'mete' }"
          exact
          v-if="store.project?.has_mete"
        />
        <q-route-tab label="Karte" :to="{ name: 'map' }" exact />
      </q-tabs>

      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref, watch, onMounted, computed } from "vue";
import { useCounterStore } from "../stores/example-store";

import { useRouter, useRoute } from "vue-router";

export default defineComponent({
  name: "MainLayout",

  components: {},

  setup() {
    const route = useRoute();
    const store = useCounterStore();
    // fetch the user information when params change

    watch(
      () => route.params.project,
      async (newId) => {
        console.log(route.params, newId);

        // console.log("Is store available?", store);
        // ["mannheim", "immendingen", "debug"].includes(route.params.project);
        // await store.setProject(route.params.project);
      },
      {
        immediate: true,
      }
    );

    const leftDrawerOpen = ref(false);

    const shownTitle = computed(() => {
      if (store.project != null) {
        return `ViewMes - ${store.project.name}`;
      } else return "ViewMes";
    });

    // store.loadProjects();
    onMounted(async () => {
      await store.loadProjects();
    });

    return {
      leftDrawerOpen,
      store,
      shownTitle,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      },
    };
  },
});
</script>
