<template>
  <q-page padding>
    <q-select
      v-model="selectedProject"
      :options="store.projects"
      label="Projekt"
      option-label="name"
    />
    <!-- content -->
  </q-page>
</template>

<script>
import { mapState } from "pinia";
import { useCounterStore } from "../stores/example-store";
import { computed } from "vue";
export default {
  // name: 'PageName',
  setup() {
    const store = useCounterStore();

    const selectedProject = computed({
      get: () => store.project,
      set: (val) => {
        console.log("Setter is called", val);
        store.setProject(val);
        /*
        store.$patch({
          project: val,
          selectedImmissionsort: null,
          selectedMesspunkt: null,
        });
        */
      },
    });

    return {
      selectedProject,
      store,
    };
  },
};
</script>
