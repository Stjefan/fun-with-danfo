import { defineStore } from "pinia";
import { DateTime } from "luxon";
import { shortFormat } from "../pages/db.js";
import { api } from "../boot/axios";

const project_2_show = "mannheim";

export const useCounterStore = defineStore("counter", {
  state: () => ({
    counter: 0,
    selectedDatetime: DateTime.now().plus({ hours: -24 * 1 }),
    projects: [],
    selectedImmissionsort: null,
    selectedMesspunkt: null,
    project: null,

    maxYAxisMesspunkt: 80,
    intervalYAxisMesspunkt: 80,

    maxYAxisTerz: 80,
    intervalYAxisTerz: 80,

    maxYAxisLr: 80,
    intervalYAxisLr: 80,

    showMete: false,
  }),
  getters: {
    doubleCount: (state) => state.counter * 2,
    selectedDate: (state) =>
      DateTime.fromFormat(
        state.selectedDatetime.toFormat(shortFormat),
        shortFormat
      ),
  },
  actions: {
    increment() {
      this.counter++;
    },
    async load() {},

    async loadProjects() {
      console.log("In loadProjects");
      this.load();
      return api
        .get(
          `/tsdb/projekt/`
          // `https://www.kuf-remote.de/blub/bla/projekt/`
          // `http://localhost:8000/tsdb/projekt`
        )
        .then((response) => {
          console.log(response);
          this.projects = response.data;

          for (let p of this.projects) {
            p.has_mete = p.messpunkt_set.some((mp) => mp.is_meteo_station);
          }
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    },
    setProject(val) {
      this.project = val;
      this.selectedImmissionsort = this.project.immissionsort_set[0];
      this.selectedMesspunkt = this.project.messpunkt_set[0];
    },
  },
});
