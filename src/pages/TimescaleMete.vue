<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-sm">
      <q-btn label="-24h" @click="addMinutes(-24 * 60)" />
      <q-input type="date" v-model="selectedDate" />
      <q-btn label="+24h" @click="addMinutes(24 * 60)" />
    </div>
    <q-btn icon="refresh" @click="plotMete" />
    <div id="mete-charts" style="height: 75vh" />
  </q-page>
</template>

<script>
import { onMounted, ref, watch, computed } from "vue";

import Plotly from "plotly.js-dist-min";
import { useQuasar } from "quasar";

import { DateTime } from "luxon";

import _ from "lodash";

import { queryApi, myFormat, myFormatWithZ, shortFormat } from "./db.js";

import { mapState } from "pinia";
import { useCounterStore } from "../stores/example-store";

const urlFormat = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss";
import { api } from "../boot/axios";

export default {
  // name: 'PageName',
  setup() {
    const $q = useQuasar();

    const store = useCounterStore();

    // const currentDate = ref(dayjs().format("YYYY-MM-DD"));
    // let selectedDate = ref(store.selectedDate.toFormat(shortFormat));

    const selectedDate = computed({
      get: () => store.selectedDatetime.toFormat(shortFormat),
      set: (val) => {
        console.log("Setter is called", val);
        store.$patch({
          selectedDatetime: DateTime.fromFormat(val, shortFormat),
        });
      },
    });

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

    onMounted(() => {
      console.log("On mounted");
      createMetePlot();
      plotMete();
    });

    watch(selectedDate, (newVal, oldVal) => {
      console.log("Wachting selectedDate", newVal, oldVal);
      plotMete(newVal);
    });

    function plotMete(targetDate) {
      $q.loading.show();
      clearChart();
      console.log("In readMete");
      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
      const promises = [];
      const from_date = myStartTime.plus({ hours: 0 }).toFormat(urlFormat);
      const to_date = myStartTime.plus({ hours: 24 }).toFormat(urlFormat);
      const q = `/tsdb/mete/?time_after=${from_date}&time_before=${to_date}`;
      console.log(q);

      api
        .get(
          // `/tsdb/mete/?messpunkt=&time_after=2022-10-01T00%3A01%3A00&time_before=2022-10-01T00%3A03%3A00`
          // ?time_after=2022-10-30T00%3A00%3A00&time_before=2022-10-30T23%3A00%3A00/
          q
          // `/tsdb/mete/?time_after=${from_date}&time_before=${to_date}/`
        )
        .then((response) => {
          console.log(response);
          return response.data;
        })
        .then((rows) => {
          const groups = [
            "humidity",
            "pressure",
            "rain",
            "temperature",
            // "time",
            "winddirection",
            "windspeed",
          ];
          console.log(rows);
          if (rows.length == 0) throw new Error("No rows were returned");

          const result = {};
          for (let g of groups) {
            result[g] = {
              x: [],
              y: [],
            };
          }
          for (let g of groups) {
            for (let r of rows) {
              result[g].y.push(r[g]);
              result[g].x.push(r["time"]);
            }
          }

          return result;
        })
        .then((meteCall) => {
          console.log("results", meteCall);

          updateChartData(meteCall);
          $q.loading.hide();

          return meteCall.data;
        })
        .catch((e) => {
          console.error(e);
          $q.notify({
            message: `Fehler beim Laden der Daten: ${e}`,
            type: "negative",
          });
        })
        .finally(() => {
          $q.loading.hide();
        });
    }
    function createMetePlot() {
      var data = [
        {
          x: [], // myData.x,
          y: [], // myData.regen,
          type: "bar",
          xaxis: "x1",
          yaxis: "y1",
          name: "Regen",
        },
        {
          x: [], //myData.x,
          y: [], // myData.temperature,
          type: "line",
          xaxis: "x2",
          yaxis: "y2",
          name: "Temperatur",
        },
        {
          x: [], // myData.x,
          y: [], // myData.windspeed,
          type: "bar",
          xaxis: "x3",
          yaxis: "y3",
          name: "Windgeschwindigkeit",
        },
        {
          x: [], // myData.x,
          y: [], // myData.humidity,
          type: "bar",
          xaxis: "x4",
          yaxis: "y4",
          name: "Luftfeuchtigkeit",
        },
        {
          x: [], // myData.x,
          y: [], // myData.pressure,
          type: "bar",
          xaxis: "x5",
          yaxis: "y5",
          name: "Luftdruck",
        },
        {
          type: "scatterpolar",
          mode: "markers",
          r: [], // myData.x,
          theta: [], // myData.winddirection,
          line: {
            color: "black",
          },
          subplot: "polar",
          name: "Windrichtung",
        },
      ];

      const multiplotLayout = {
        title: "Wetterübersicht",
        xaxis: {
          domain: [0, 0.5],
          anchor: "y1",
          type: "date",
          //range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
        },
        yaxis: {
          domain: [0.0, 0.22],
          anchor: "x1",
          title: "Regen [mm]",
          range: [0, 10],
        },
        polar: {
          domain: {
            x: [0.65, 1],
            y: [0.25, 1],
          },
          angularaxis: {
            direction: "clockwise",
          },
          radialaxis: {
            type: "date",
            visible: true,
            //range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
          },
        },
        xaxis2: {
          domain: [0, 0.5],
          anchor: "y2",
          type: "date",
          // range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
        },
        yaxis2: {
          domain: [0.25, 0.48],
          anchor: "x2",
          title: "Temperatur [°C]",
        },
        xaxis3: {
          domain: [0, 0.5],
          anchor: "y3",
          type: "date",

          // range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
        },
        yaxis3: {
          domain: [0.5, 0.73],
          anchor: "x3",
          title: "Windgeschwindigkeit [m/s]",
        },
        xaxis4: {
          domain: [0, 0.5],
          anchor: "y4",
          type: "date",
          // range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
        },
        yaxis4: {
          domain: [0.75, 0.98],
          anchor: "x4",
          title: "Luftdruck [mbar]",
          range: [900, 1050],
        },
        xaxis5: {
          domain: [0.65, 1],
          anchor: "y5",
          type: "date",

          // range: [shownDate.getTime(), shownDate.getTime() + 24 * 3600 * 1000],
        },
        yaxis5: {
          domain: [0.0, 0.15],
          anchor: "x5",
          title: "Luftfeuchtigkeit",
        },
      };
      //data.push(polardata[0]);
      var config = { responsive: true, locale: "de" };
      Plotly.newPlot("mete-charts", data, multiplotLayout, config);
    }

    function clearChart() {
      const graphDiv = document.getElementById("mete-charts");

      console.log("Graph-data:", graphDiv.data);
      /*

      for (let p of [...graphDiv.data]) {
        p.x = [];
        p.y = [];
      }
      */

      Plotly.deleteTraces(graphDiv, [...graphDiv.data.keys()]);
    }

    function updateChartData(updateData) {
      const myTraces = [];
      const graphDiv = document.getElementById("mete-charts");
      clearChart();

      const properties = [
        "rain",
        "temperature",
        "windspeed",
        "winddirection",
        "humidity",
        "pressure",
      ];
      const styling = {
        rain: {
          color: "blue",
          type: "bar",
          name: "Regen",
        },
        temperature: {
          color: "red",
          type: "line",
          name: "Temperatur",
        },
        windspeed: {
          color: "blue",
          type: "bar",
          name: "Windgeschwindigkeit",
        },
        pressure: {
          color: "blue",
          type: "bar",
          name: "Luftdruck",
        },
        humidity: {
          color: "blue",
          type: "bar",
          name: "Luftfeuchtigkeit",
        },
        winddirection: {
          color: "red",
          name: "Windrichtung",
        },
      };
      const prop2Axis = {
        rain: ["x1", "y1"],
        temperature: ["x2", "y2"],
        windspeed: ["x3", "y3"],
        pressure: ["x4", "y4"],
        humidity: ["x5", "y5"],
        winddirection: "polar",
      };

      console.log(updateData);

      for (let p of properties) {
        console.log(p);
        let myTrace;
        if (p != "winddirection") {
          myTrace = {
            x: updateData[p].x,
            y: updateData[p].y,
            xaxis: prop2Axis[p][0],
            yaxis: prop2Axis[p][1],
            type: styling[p]["type"],
            marker: {
              color: styling[p]["color"], //"rgb(82, 82, 82)",
            },
            line: {
              color: styling[p]["color"], //"rgb(82, 82, 82)",
            },
            name: styling[p]["name"],
          };
        } else {
          console.log(updateData);
          myTrace = {
            type: "scatterpolar",
            mode: "markers",
            r: updateData[p].x, // myData.x,
            theta: updateData[p].y, // myData.winddirection,
            line: {
              color: "red",
            },
            subplot: "polar",
            name: "Windrichtung",
          };
        }
        myTraces.push(myTrace);
      }
      console.log(myTraces);
      Plotly.addTraces(graphDiv, myTraces);
    }

    return { selectedDate, plotMete, addMinutes, store };
  },
};
</script>
