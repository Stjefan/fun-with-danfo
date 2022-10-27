<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-md">
      <q-input
        type="date"
        :model-value="selectedDate"
        @update:model-value="foo"
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
      <q-btn label="Lr" @click="plotLr" />
      <q-btn label="proj" @click="blub" />
      <q-select
        class="col-3"
        v-model="selectedImmissionsort"
        option-label="name"
        :options="immissionsortOptions"
        label="Immissionsort"
      />
      {{ selectedImmissionsort }}
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
import { api } from "../boot/axios";
import { DateTime } from "luxon";

export default {
  // name: 'PageName',
  setup() {
    const $q = useQuasar();

    const store = useCounterStore();

    // const currentDate = ref(dayjs().format("YYYY-MM-DD"));
    let selectedDate = computed(() => store.selectedDate.toFormat(shortFormat));

    const intervalYAxisLr = ref(50);
    const maxYAxisLr = ref(50);

    const raiseError = () => {
      throw new Error("This is a test error");
    };
    watch([maxYAxisLr, intervalYAxisLr], () => {
      updateLayout(selectedDate.value, maxYAxisLr.value, intervalYAxisLr.value);
    });
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
      $q.loading.show();

      console.log("On mounted");

      // simplePlot();
      const idsBeurteilungszeitraum = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      const immissionsort_id = selectedImmissionsort.value.id;
      console.log("In readLr");

      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
      const promises = [];
      for (let h of start_end_times) {
        const from_date = myStartTime.plus({ hours: h[0] }).toFormat(urlFormat);
        const to_date = myStartTime.plus({ hours: h[1] }).toFormat(urlFormat);
        const nested_promise_array = [];
        for (let ursache of store.project.laermursacheanimmissionsorten_set) {
          nested_promise_array.push(
            api
              .get(
                //"http://localhost:8000/tsdb/lr?time_after=2022-10-25+03%3A00%3A00&time_before=2022-10-25+04%3A00%3A00&immissionsort=6&verursacht=10"
                `http://localhost:8000/tsdb/lr?time_after=${from_date}&time_before=${to_date}&immissionsort=${immissionsort_id}&verursacht=${ursache.id}`
              )
              .then((response) => ({
                // console.log(response);
                name: ursache.name,
                x: response.data.map((i) => i.time),
                y: response.data.map((i) => i.pegel),
              }))
          );
        }
        promises.push(Promise.all(nested_promise_array));
      }

      return (
        Promise.all(promises)
          .then((lrCalls) => {
            console.log(lrCalls);
            const totalResult = {};
            for (let beurteilungszeitraum of idsBeurteilungszeitraum) {
              let result = {};
              const grenzwert =
                beurteilungszeitraum != 6
                  ? selectedImmissionsort.value.grenzwert_nacht
                  : selectedImmissionsort.value.grenzwert_tag;
              if (lrCalls[beurteilungszeitraum][0].x.length > 0) {
                lrCalls[beurteilungszeitraum].unshift({
                  // console.log(response);
                  name: "Grenzwert",
                  x: lrCalls[beurteilungszeitraum][0].x,
                  y: lrCalls[beurteilungszeitraum][0].x.map((i) => grenzwert),
                });
              }
            }

            updateChartData(lrCalls);
            updateLayout(
              selectedDate.value,
              maxYAxisLr.value,
              intervalYAxisLr.value
            );

            // console.log(result);
          })

          //console.log("Promise ended", totalResult);
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
          })
      );
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
      let already_found_non_empty_sequence = false;
      for (let j of idsBeurteilungszeitraum) {
        const graphDiv = document.getElementById("lrPlot");
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
        console.log(updateData[j]);
        let iteration = 0;
        let has_elements = false;

        for (let q of updateData[j]) {
          has_elements = q.x.length > 0;
          console.log(q);

          const myTrace = {
            x: q.x,
            y: q.y,
            xaxis: `x${j + 1}`,
            yaxis: `y${j + 1}`,
            line: {
              color: getColor(iteration),
            },
            legendgroup: q.name,

            showlegend: !already_found_non_empty_sequence && has_elements,
            name: q.name,
          };

          myTraces.push(myTrace);
          iteration++;
        }
        if (has_elements) {
          already_found_non_empty_sequence = true;
        }

        if (myTraces.length > 0) {
          // console.log(hasBeenExecuted);
          Plotly.addTraces(graphDiv, myTraces);
        }
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
      myUpdateArgs = {
        ...myUpdateArgs,
        ...{
          title:
            selectedImmissionsort.value != null
              ? `IO ${selectedImmissionsort.value.id_external} - ${selectedImmissionsort.value.name} am ${myDate}`
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

    const selectedImmissionsort = ref(null);

    const immissionsortOptions = computed(() => {
      return store.project?.immissionsort_set;
    });

    const laermursachen = computed(() => {
      return store.project?.laermursachenanimmissionsorten_set;
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
    };
  },
};
</script>
