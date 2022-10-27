<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> ViewMes</q-toolbar-title>

        <div>v 2022-10a</div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header> Dashboards </q-item-label>
        <q-btn flat label="Immissionsorte" :to="{ name: 'io' }" />
        <q-btn flat label="Messpunkte" :to="{ name: 'mp' }" />
        <q-btn flat label="Wetter" :to="{ name: 'mete' }" />
        <q-btn flat label="Karte" :to="{ name: 'map' }" />
        <q-btn flat label="Einstellungen" :to="{ name: 'settings' }" />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from "vue";
import { useCounterStore } from "../stores/example-store";
export default defineComponent({
  name: "MainLayout",

  components: {},

  setup() {
    const leftDrawerOpen = ref(false);
    const store = useCounterStore();

    store.loadProjects();

    return {
      leftDrawerOpen,
      toggleLeftDrawer() {
        leftDrawerOpen.value = !leftDrawerOpen.value;
      },
    };
  },
});
</script>
