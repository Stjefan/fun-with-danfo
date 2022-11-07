import { defineStore } from "pinia";
import { DateTime } from "luxon";
import { shortFormat } from "../pages/db.js";
import { api } from "../boot/axios";
import { config_immendingen, config_mannheim } from "../pages/project.js";

config_immendingen["selected_io"] = config_immendingen.ios[0];
config_mannheim["selected_io"] = config_mannheim.ios[0];

const project_2_show = "mannheim";

export const useCounterStore = defineStore("counter", {
  state: () => ({
    counter: 0,
    selectedDatetime: DateTime.now().plus({ hours: -24 * 3 }),
    projects: [],
    selectedProject: config_immendingen,
    project: null,
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
    async load() {
      console.log("In load");
      return api
        .get(
          `http://kuf-srv-02/blub/bla/tsdb/projekt/?name__icontains=${project_2_show}`
        )
        .then((response) => {
          console.log(response);
          this.project = response.data[0];
        });
    },
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
        })
        .catch((err) => {
          console.log(err);
          throw err;
        });
    },
  },
});
