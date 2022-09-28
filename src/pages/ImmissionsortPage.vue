<template>
  <q-page padding>
    <input type="date" v-model="selectedDate" />
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
import { readIO } from "./db.js";
import { DateTime } from "luxon";
import { ref, computed, watch } from "vue";

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
    let selectedDate = ref("2022-06-25");

    const selectedDatetime = computed(() => {
      let dt = DateTime.fromFormat(selectedDate.value, "yyyy-MM-dd");

      return dt;
    });

    async function plotLr() {
      console.log(selectedDatetime.value);
      const df = await readIO(selectedDatetime.value);
      let config = {
        columns: ["_value"],
      };
      let layout = {
        title: "Beurteilungspegel",
        xaxis: {
          title: "Datum",
        },
        yaxis: {
          title: "db(A)",
          range: [0, 60],
        },
      };

      if (false) {
        const x = myDF.index;
        const y = myDF["_value"].values;
      }

      let data = [
        //trace2, trace3
      ];

      let cnt = 7;

      for (let i of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      }

      for (let s in df) {
        const x = df[s].index;
        const y = df[s]["_value"].values;
        let trace1 = {
          x: x,
          y: y,
          name: `${s}`,
          mode: "lines+markers",
          marker: {
            /*
            color: `rgb(${(cnt % 8) ** 2 % 256}, ${
              ((cnt + -3) % 8) ** 2 % 256
            }, ${0})`,
            */
            size: 2,
          },
        };
        cnt++;
        data.push(trace1);
        // df[s].plot("plot_lr").line({ config, layout });
      }
      Plotly.newPlot("plot_lr", data, layout);
    }
    //2023-10-21T17:26:15
    //.toFormat("yyyy-MM-dd'T'HH:mm:ss")

    const maxYAxis = ref(50);
    const intervalYAxis = ref(50);
    return {
      maxYAxis,
      intervalYAxis,
      selectedDate,
      selectedDatetime,
      readIO,
      plotLr,
    };
  },
};
</script>
