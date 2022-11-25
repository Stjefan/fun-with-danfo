<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-sm">
      <q-btn
        label="-24h"
        @click="addMinutes(-24 * 60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-input
        type="date"
        :model-value="selectedDate"
        @update:model-value="foo"
      />
      <q-btn
        label="+24h"
        @click="addMinutes(+24 * 60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />

      <q-select
        class="col-3"
        v-model="selectedImmissionsort"
        option-label="name"
        :options="immissionsortOptions"
        label="Immissionsort"
      />

      <q-input
        type="number"
        v-model.number="maxYAxisLr"
        label="Max. Y-Achse Lr"
      />
      <q-input
        type="number"
        v-model.number="intervalYAxisLr"
        label="Intervall Y-Achse Lr"
      />
      <q-btn
        icon="refresh"
        @click="plotLr"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
    </div>

    <div id="lrPlot" style="height: 80vh"></div>
  </q-page>
</template>

<script>
import Plotly from "plotly.js-dist-min";
import { onMounted, ref, watch, computed, onErrorCaptured } from "vue";

import { useQuasar } from "quasar";

import {
  queryApi,
  myFormat,
  myFormatWithZ,
  shortFormat,
  start_end_times,
} from "./db.js";

import { mapState } from "pinia";
import { useCounterStore } from "../stores/example-store";

const urlFormat = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss";
const urlFormatWithTZ = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss'%2B'Z";
import { api } from "../boot/axios";
import { DateTime } from "luxon";

export default {
  // name: 'PageName',
  setup() {
    const $q = useQuasar();

    const store = useCounterStore();

    // const currentDate = ref(dayjs().format("YYYY-MM-DD"));
    const selectedDate = computed({
      get: () => store.selectedDatetime.toFormat(shortFormat),
      set: (val) => {
        console.log("Setter is called", val);
        store.$patch({
          selectedDatetime: DateTime.fromFormat(val, shortFormat),
        });
      },
    });

    const intervalYAxisLr = computed({
      get: () => store.intervalYAxisLr,
      set: (val) => {
        store.$patch({
          intervalYAxisLr: val,
        });
      },
    });
    const maxYAxisLr = computed({
      get: () => store.maxYAxisLr,
      set: (val) => {
        store.$patch({
          maxYAxisLr: val,
        });
      },
    });

    const raiseError = () => {
      throw new Error("This is a test error");
    };
    watch([maxYAxisLr, intervalYAxisLr], () => {
      updateLayout(selectedDate.value, maxYAxisLr.value, intervalYAxisLr.value);
    });

    function addMinutes(noMinutes) {
      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);

      selectedDate.value = myStartTime
        .plus({ minutes: noMinutes })
        .toFormat(shortFormat);
    }
    /*
    watch([currentDate, selectedImmissionsort], (newVal, oldVal) => {
      console.log("Wachting currentDate", newVal, oldVal);
      updateLayout(
        currentDate.value,
        maxYAxisLr.value,
        intervalYAxisLr.value,
        1 // `IO ${selectedImmissionsort.value.id}`
      );
      plotLr(selectedImmissionsort.value, currentDate.value);
    });
    */
    function getHoursBeurteilungszeitraum(i) {
      let startingHour = 0;
      let endingHour = 0;
      if (i == 6) {
        startingHour = 6;
        endingHour = 22;
      } else if (i == 7) {
        startingHour = 22;
        endingHour = 23;
      } else if (i == 8) {
        startingHour = 23;
        endingHour = 24;
      } else {
        startingHour = i;
        endingHour = i + 1;
      }
      return { startingHour, endingHour };
    }

    onMounted(() => {
      createPlot();
      updateLayout(
        selectedDate.value,
        selectedDate.value,
        maxYAxisLr.value,
        intervalYAxisLr.value
      );

      // plotLr();
    });

    onErrorCaptured((err, instance, info) => {
      console.log(err, instance, info);
      $q.notify({
        message: `Fehler beim Laden der Daten: ${err}`,
        type: "negative",
      });
      $q.loading.hide();
    });

    function plotLr() {
      if (store.project == null) {
        throw new Error("No projected selected");
      }
      if (selectedImmissionsort.value == null) {
        throw new Error("No IO selected");
      }
      if (true) {
        $q.loading.show();

        console.log("On mounted");
        // simplePlot();
        const idsBeurteilungszeitraum = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        const immissionsort_id = selectedImmissionsort.value.id;
        console.log("In readLr");

        let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
        const promises = [];
        let beurteilungszeitraum = 0;
        for (let h of start_end_times) {
          const from_date = myStartTime
            .plus({ hours: h[0] })
            .toFormat(urlFormatWithTZ);

          const to_date = myStartTime
            .plus({ hours: h[1] })
            .toFormat(urlFormatWithTZ);
          const url = `/tsdb/more-lr/?time_after=${from_date}&time_before=${to_date}&immissionsort=${immissionsort_id}`;
          console.log("URL: ", url, from_date);
          const p = api.get(url).then((response) => {
            const grenzwert =
              beurteilungszeitraum != 6
                ? selectedImmissionsort.value.grenzwert_nacht
                : selectedImmissionsort.value.grenzwert_tag;
            response.data.unshift({
              name: "Grenzwert",
              ts: [
                {
                  time: myStartTime.plus({ hours: h[0] }).toFormat(myFormat),
                  pegel: grenzwert,
                },
                {
                  time: myStartTime
                    .plus({ hours: h[1], seconds: -1 })
                    .toFormat(myFormat),
                  pegel: grenzwert,
                },
              ],
            });
            return response.data;
          });
          promises.push(p);
          beurteilungszeitraum++;
        }

        return Promise.all(promises)
          .then((lrCalls) => {
            console.log(lrCalls);
            const totalResult = {};
            updateChartData(lrCalls);

            updateLayout(
              selectedDate.value,
              maxYAxisLr.value,
              intervalYAxisLr.value
            );
          })

          .catch((e) => {
            console.log("error catch with then / catch:", e);
            $q.notify({
              message: `Fehler beim Laden der Daten: ${e}`,
              type: "negative",
            });
          })
          .finally(() => {
            console.log("Run finally block...");
            $q.loading.hide();
          });
      }
    }

    function updatePlotlyLayout(target, args) {
      const graphDiv = document.getElementById(target);
      console.log("Before error?");
      Plotly.relayout(graphDiv, args);
    }

    function updateChartData(updateData) {
      console.log("updateChartData", updateData);
      // console.log("Update data", updateData);
      const myTraces = [];
      const idsBeurteilungszeitraum = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      let hasBeenExecuted = {};
      let already_found_non_empty_sequence = {};
      const graphDiv = document.getElementById("lrPlot");
      for (let j of idsBeurteilungszeitraum) {
        console.log("Update with", updateData[j]);

        //console.log(j);
        //console.log(graphDiv.data);
        const indices = graphDiv.data
          .map((i, idx) => ({
            is_searched: (i.xaxis === j + 1) != 1 ? `x${j + 1}` : "x",
            index: idx,
          }))
          .filter((i) => i.is_searched)
          .map((i) => i.index);

        //console.log("delete", indices);
        Plotly.deleteTraces(graphDiv, indices);
        /*
        if (Object.keys(updateData[j]).length == 0) {
          const myTrace = {
            x: [],
            y: [],
            xaxis: `x${j + 1}`,
            yaxis: `y${j + 1}`,
            line: {
              color: "rgb(82, 82, 82)",
            },
            showlegend: false,
          };
          myTraces.push(myTrace);
        }
        */

        let iteration = 0;
        let has_elements = false;
        console.log("Before Iteration");
        for (let q of updateData[j]) {
          has_elements = q.ts.length > 0;
          console.log(q);

          const myTrace = {
            x: q.ts.map((i) => i.time),
            y: q.ts.map((i) => i.pegel),
            xaxis: `x${j + 1}`,
            yaxis: `y${j + 1}`,
            line: {
              color: getColor(iteration),
            },
            legendgroup: q.name,

            showlegend:
              !already_found_non_empty_sequence[q.name] && has_elements,
            name: q.name,
          };

          if (has_elements) {
            already_found_non_empty_sequence[q.name] = true;
          }

          myTraces.push(myTrace);
          iteration++;
        }
      }
      console.log("mytraces", myTraces);

      if (myTraces.length > 0) {
        // console.log(hasBeenExecuted);
        Plotly.addTraces(graphDiv, myTraces);
      }
    }
    function getColor(j) {
      switch (j) {
        case 0:
          return "red";
        case 1:
          return "blue";

        case 2:
          return "green";
        case 3:
          return "gray";
        case 4:
          return "purple";
        case 5:
          return "pink";
        case 6:
          return "olive";
        case 7:
          return "orange";
        case 8:
          return "coral";
        case 9:
          return "black";
        case 10:
          return "brown";
        default:
          return "yellow";
      }
    }

    function createPlot() {
      const plotData = [];
      for (let i = 1; i < 10; i++) {
        plotData.push({
          x: [],
          y: [],
          type: "line",
          xaxis: `x${i}`,
          yaxis: `y${i}`,
          //name: mapVerursacherNames(v),
          // legendgroup: v,
          line: {
            // color: colorClasses[v], //"rgb(82, 82, 82)",
          },
          showlegend: i == 1,
        });
      }
      const config = { responsive: true, locale: "de" };
      Plotly.newPlot("lrPlot", plotData, createLaylout(), config);
    }

    function createLaylout() {
      let layout = {
        title: "Beurteilungspegel",

        legend: {
          x: 1,
          y: 0.25,
          xanchor: `auto`,
          yanchor: `top`,
          // orientation: "h",
          font: {
            // size: 8,
          },
        },
      };
      for (let i = 1; i < 10; i++) {
        if (i == 7) {
          const axis7 = {};
          axis7[`yaxis${i}`] = {
            domain: [0.35, 0.65],
            anchor: `x7`,
          };

          axis7[`xaxis${i}`] = { anchor: `y${i}`, type: "date" };

          layout = { ...layout, ...axis7 };
        } else {
          layout = { ...layout, ...builder(i) };
        }
      }

      //console.log(i);
      // console.log(layout);
      return layout;
    }
    function builder(j) {
      const myResult = {};
      const i = j;
      myResult[`xaxis${i}`] = {
        domain: [0.17 * (i - 1), 0.17 * i - 0.02],
        anchor: `y${i}`,
        type: "date",
        /*
    range: [
      chosenDay.getTime() + (i - 1) * 3600 * 1000,
      chosenDay.getTime() + i * 3600 * 1000,
    ],
    */
      };
      myResult[`yaxis${i}`] = {
        domain: [0.75, 1],
        anchor: `x${i}`,
        // range: [maxYAxis - rangeYAxis, maxYAxis],
      };
      if (j >= 8) {
        myResult[`xaxis${i}`].domain = [0.17 * (j - 8), 0.17 * (j - 7) - 0.02];
        // myResult[`xaxis${i}`].range[0] += 15 * 1000 * 3600;
        // myResult[`xaxis${i}`].range[1] += 15 * 1000 * 3600;
        myResult[`yaxis${i}`].domain = [0, 0.25];
      }

      return myResult;
    }

    function updateLayout(myDate, maxYAxisLr, intervalYAxisLr) {
      console.log(myDate);
      const vorhandeneBeurteilungszeitraeume = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      let myUpdateArgs = [];
      for (let i of vorhandeneBeurteilungszeitraeume) {
        const { startingHour, endingHour } = getHoursBeurteilungszeitraum(i);
        console.log(startingHour, endingHour);
        /*
        const startBeurteilungszeitraum = DateTime.fromFormat(myDate)
          .add(startingHour, "hour")
          .format("YYYY-MM-DDTHH:mm:ss");

        const endBeurteilungszeitraum = dayjs(myDate)
          .add(endingHour, "hour")
          .format("YYYY-MM-DDTHH:mm:ss");

        let myKey = i == 0 ? "xaxis.range" : `xaxis${i + 1}.range`;

        myUpdateArgs[myKey] = [
          startBeurteilungszeitraum,
          endBeurteilungszeitraum,
        ];
        */

        myUpdateArgs[`yaxis${i == 0 ? "" : i + 1}.range`] = [
          maxYAxisLr - intervalYAxisLr,
          maxYAxisLr,
        ];
      }
      const myDateAsDatetime = DateTime.fromFormat(myDate, "yyyy-MM-dd");
      myUpdateArgs = {
        ...myUpdateArgs,
        ...{
          title:
            selectedImmissionsort.value != null
              ? `IO ${selectedImmissionsort.value.id_external} - ${
                  selectedImmissionsort.value.name
                } am ${myDateAsDatetime.toFormat("dd.MM.yy")}`
              : "",
        },
      };
      updatePlotlyLayout("lrPlot", myUpdateArgs);
    }

    function foo(args) {
      console.log(DateTime.fromFormat(args, shortFormat));
      store.$patch({
        selectedDatetime: DateTime.fromFormat(args, shortFormat),
      });
    }

    function blub() {
      store
        .load()
        .then((res) =>
          console.log(store.project.laermursacheanimmissionsorten_set)
        );
    }

    const selectedImmissionsort = computed({
      get: () => {
        return store.selectedImmissionsort;
      },
      set: (val) => {
        console.log("Setter is called");
        store.$patch({
          selectedImmissionsort: val,
        });
      },
    });

    const immissionsortOptions = computed(() => {
      return store.project?.immissionsort_set;
    });

    const laermursachen = computed(() => {
      return store.project?.laermursachenanimmissionsorten_set;
    });

    watch([selectedDate, selectedImmissionsort], (val) => {
      plotLr();
    });

    return {
      raiseError,
      foo,
      selectedDate,
      intervalYAxisLr,
      maxYAxisLr,
      selectedImmissionsort,
      immissionsortOptions,
      store,
      plotLr,
      blub,
      addMinutes,
    };
  },
};
</script>
