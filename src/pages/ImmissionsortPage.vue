<template>
  <q-page padding>
    <div class="row q-gutter-sm">
      <q-btn label="-24h" @click="addMinutes(-24 * 60)" />
      <q-input type="date" v-model="selectedDate" />
      <q-btn label="+24h" @click="addMinutes(24 * 60)" />
    </div>
    <div class="row">
      <q-select
        v-model="project"
        :options="projects"
        label="Projekt"
        class="col-3"
        option-label="bezeichnung"
      />
      <q-select
        v-model="project.selected_io"
        :options="project.ios"
        label="Immissionsort"
        class="col-3"
        option-label="name"
      />
    </div>
    <div class="row">
      <q-input type="number" v-model="maxYAxis" label="Max. Y-Achse" />
      <q-input type="number" v-model="intervalYAxis" label="Interval Y-Achse" />
    </div>
    <q-btn label="Aktualisieren" @click="plotLr" />
    <div id="plot_lr"></div>
  </q-page>
</template>

<script>
import Plotly from "plotly.js-dist-min";
import {
  readIO,
  myFormat,
  shortFormat,
  plotly_config,
  myFormatWithZ,
} from "./db.js";
import { DateTime } from "luxon";
import { ref, computed, watch } from "vue";

import { config_immendingen, config_mannheim } from "./project.js";

config_immendingen["selected_io"] = config_immendingen.ios[0];
config_mannheim["selected_io"] = config_mannheim.ios[0];

export default {
  // name: 'PageName',
  setup() {
    /*
    let selectedDatetime = ref(
      DateTime.fromObject({
        year: 2022,
        month: 9,
        day: 5,
      })
    );
    */

    const lr_plot_name = "plot_lr";
    let selectedDate = ref("2022-06-25");

    const standard_layout_lr = {
      title: "Beurteilungspegel",
      xaxis: {
        title: "Datum",
      },
    };

    const projects = [config_immendingen, config_mannheim];
    const project = ref(projects[0]);

    const selectedDatetime = computed(() => {
      let dt = DateTime.fromFormat(selectedDate.value, "yyyy-MM-dd");

      return dt;
    });

    function addMinutes(noMinutes) {
      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);

      selectedDate.value = myStartTime
        .plus({ minutes: noMinutes })
        .toFormat(shortFormat);
    }

    let myColorDict = {
      grenzwert: "red",
      gesamt: "blue",
    };

    let colorCounter = 0;

    function getRandomColor(counter) {
      return `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(
        Math.random() * 256
      )}, ${Math.floor(Math.random() * 256)})`;
    }

    function colorMapping(arg) {
      if (myColorDict[arg] == null) {
        myColorDict[arg] = getRandomColor();
      }

      return myColorDict[arg];
    }

    async function plotLr() {
      console.log(selectedDatetime.value, project.value.selected_io);
      const df = await readIO(
        selectedDatetime.value,
        project.value.selected_io,
        project.value.bezeichnung
      );
      let myVisibiltyDict = {};
      let config = {
        columns: ["_value"],
      };
      let layout;
      if (true) {
        layout = {
          ...standard_layout_lr,
          yaxis: {
            title: "Lr(A)",
            range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
          },
        };
      } else {
        layout = {
          ...standard_layout_lr,
          annotations: [
            {
              text: "No matching data found",
              xref: "paper",
              yref: "paper",
              showarrow: false,
              font: {
                size: 28,
              },
            },
          ],
        };
      }

      let data = [];
      for (let key in df) {
        const s = df[key];
        // console.log(s);
        if (Object.keys(s).length == 1) {
          continue;
        }
        for (let t in s) {
          const x = s[t].index;
          const y = s[t]["_value"].values;
          let trace1 = {
            x: x,
            y: y,
            name: `${t}_${key}`,
            mode: "lines+markers",
            marker: {
              // color: t.includes("grenzwert") ? "red" : t.inclu,
              /*
            color: `rgb(${(cnt % 8) ** 2 % 256}, ${
              ((cnt + -3) % 8) ** 2 % 256
            }, ${0})`,
            */
              size: 2,
            },
          };
          trace1.marker.color = colorMapping(t);
          data.push(trace1);
          if (myVisibiltyDict[t] != undefined) {
            console.log(myVisibiltyDict[t]);

            trace1.showlegend = false;
          } else {
            myVisibiltyDict[t] = 1;
          }
        }
        // df[s].plot("plot_lr").line({ config, layout });
      }
      Plotly.newPlot("plot_lr", data, layout, plotly_config);
    }
    //2023-10-21T17:26:15
    //.toFormat("yyyy-MM-dd'T'HH:mm:ss")

    const maxYAxis = ref(50);
    const intervalYAxis = ref(50);

    watch([maxYAxis, intervalYAxis], (newVal) => {
      let myStartTime = selectedDatetime.value;

      const graphDiv = document.getElementById(lr_plot_name);

      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);
      let selected_io_id = 4;

      let myEndTime = myStartTime.plus({ hours: 24 }).toFormat(myFormatWithZ);

      let layout = {
        ...standard_layout_lr,
        xaxis: {
          title: "Date",
          type: "date",

          // range: [myStartTimeString, myEndTime],
        },
        yaxis: {
          title: "Lr(A)",
          range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
        },
      };

      Plotly.relayout(graphDiv, layout);
    });
    return {
      maxYAxis,
      intervalYAxis,
      selectedDate,
      selectedDatetime,
      readIO,
      plotLr,
      addMinutes,
      projects,
      project,
    };
  },
};
</script>
