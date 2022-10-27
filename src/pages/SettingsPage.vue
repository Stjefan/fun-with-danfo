<template>
  <q-page padding>
    <q-select
      v-model="store.project"
      :options="store.projects"
      label="Projekt"
      option-label="name"
    />
    <q-checkbox
      :modelValue="store.selectedProject.hasMeteData"
      label="Wetterstation vorhanden"
      :disable="true"
    />
    <!-- content -->
  </q-page>
</template>

<script>
import { mapState } from "pinia";
import { useCounterStore } from "../stores/example-store";
export default {
  // name: 'PageName',
  setup() {
    const store = useCounterStore();

    return {
      store,
    };
  },
};
</script>
