<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-sm">
      <q-btn label="-24h" @click="addMinutes(-24 * 60)" />
      <q-input type="date" v-model="selectedDate" />
      <q-btn label="+24h" @click="addMinutes(24 * 60)" />
    </div>
    <div>{{ laermursachen }}</div>
    <q-btn label="Read" @click="read" />
    <q-btn label="lr" @click="readLr" />
    <q-btn label="mete" @click="readMete" />
    <q-btn label="terz" @click="readTerz" />
    <div id="lr-plot" />
  </q-page>
</template>

<script>
const urlFormat = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss";

import Plotly from "plotly.js-dist-min";
import { api } from "../boot/axios";
import { DateTime } from "luxon";
import { ref, computed, watch } from "vue";
import {
  readIO,
  myFormat,
  shortFormat,
  plotly_config,
  myFormatWithZ,
  start_end_times,
  standard_layout_lr,
} from "./db.js";

export default {
  // name: 'PageName',
  setup() {
    const selectedDate = ref(DateTime.now().toFormat(shortFormat));
    const laermursachen = ref([]);

    function readMete() {
      console.log("In readMete");
      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
      const promises = [];
      const from_date = myStartTime.plus({ hours: 0 }).toFormat(urlFormat);
      const to_date = myStartTime.plus({ hours: 24 }).toFormat(urlFormat);
      api
        .get(
          `http://localhost:8000/tsdb/mete?time_after=${from_date}&time_before=${to_date}`
        )
        .then((response) => {
          console.log(response);
        });
    }
    function read() {
      console.log("In read");
      api
        .get("http://localhost:8000/tsdb/projekt?name__icontains=mannheim")
        .then((response) => {
          console.log(response);
          laermursachen.value =
            response.data[0].laermursacheanimmissionsorten_set;
        });
    }

    function readTerz() {
      const myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
      const from_date = myStartTime.plus({ hours: 12 }).toFormat(urlFormat);
      const to_date = myStartTime.plus({ hours: 13 }).toFormat(urlFormat);
      const messpunkt_id = 3;
      console.log("In readTerz");
      api
        .get(
          `http://localhost:8000/tsdb/terz?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
        )
        .then((response) => {
          console.log(response);
        });
    }

    function readLr() {
      console.log("In readLr");

      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);
      const promises = [];
      for (let h of start_end_times) {
        const from_date = myStartTime.plus({ hours: h[0] }).toFormat(urlFormat);
        const to_date = myStartTime.plus({ hours: h[1] }).toFormat(urlFormat);
        const nested_promise_array = [];
        for (let ursache of [9, 10]) {
          nested_promise_array.push(
            api
              .get(
                //"http://localhost:8000/tsdb/lr?time_after=2022-10-25+03%3A00%3A00&time_before=2022-10-25+04%3A00%3A00&immissionsort=6&verursacht=10"
                `http://localhost:8000/tsdb/lr?time_after=${from_date}&time_before=${to_date}&immissionsort=6&verursacht=${ursache}`
              )
              .then((response) => {
                // console.log(response);
                laermursachen.value = ursache;
                return response.data;
              })
          );
        }
        promises.push(Promise.all(nested_promise_array));
      }
      Promise.all(promises).then((data) => plotLr(data));
    }

    const maxYAxis = ref(50);
    const intervalYAxis = ref(50);

    function plotLr(values) {
      console.log(values);
      let layout = {};
      if (true) {
        layout = {
          ...standard_layout_lr,
          title: `Beurteilungspegel`,
          yaxis: {
            title: "Lr(A)",
            range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
          },
          xaxis: {
            title: "Datum",
            type: "date",
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
      const x = [1, 2, 3, 4, 5];
      const y = [5, 10, 15, 30, 12];
      for (let u of values[0]) {
        let trace1 = {
          x: u.map((i) => i.time),
          y: u.map((i) => i.pegel),
          // name: `Hello`,
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
        data.push(trace1);
        console.log(trace1);
      }
      // df[s].plot("plot_lr").line({ config, layout });
      Plotly.newPlot("lr-plot", data, layout, plotly_config);
    }

    function addMinutes(noMinutes) {
      let myStartTime = DateTime.fromFormat(selectedDate.value, shortFormat);

      selectedDate.value = myStartTime
        .plus({ minutes: noMinutes })
        .toFormat(shortFormat);
    }
    return {
      laermursachen,
      selectedDate,
      addMinutes,
      read,
      readLr,
      readTerz,
      readMete,
    };
  },
};
</script>
