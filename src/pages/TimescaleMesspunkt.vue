<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-sm">
      <q-btn label="-12h" @click="addMinutes(-12 * 60)" />
      <q-btn label="-1h" @click="addMinutes(-60)" />
      <q-btn label="-15min" @click="addMinutes(-15)" />
      <q-input type="datetime-local" v-model="selectedDatetime" step="1" />
      <q-btn label="+15min" @click="addMinutes(15)" />
      <q-btn label="+1h" @click="addMinutes(60)" />
      <q-btn label="+12h" @click="addMinutes(12 * 60)" />
    </div>
    <q-select
      class="col-3"
      v-model="selectedMesspunkt"
      option-label="name"
      :options="messpunktOptions"
      label="Messpunkt"
    />
    {{ selectedMesspunkt }}
    <div class="row q-gutter-sm">
      <q-btn label="read" @click="read" />
    </div>
    <div id="plot-messpunkt" />
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
import { useCounterStore } from "../stores/example-store";
export default {
  // name: 'PageName',
  setup() {
    const selectedDate = ref(DateTime.now().toFormat(shortFormat));
    const laermursachen = ref([]);
    const store = useCounterStore();

    const selectedDatetime = ref(
      DateTime.now().plus({ minutes: -30 }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
      //2023-10-21T17:26:15
    );

    const selectedDatetimeFloor = computed(() => {
      let dt = DateTime.fromFormat(selectedDatetime.value, myFormat);

      return dt
        .plus({ minutes: -dt.minute % 15, seconds: -dt.second })
        .toFormat(myFormat);
    });

    function addMinutes(noMinutes) {
      let myStartTime = DateTime.fromFormat(selectedDatetime.value, myFormat);

      selectedDatetime.value = myStartTime
        .plus({ minutes: noMinutes })
        .toFormat(myFormat);
    }

    function read() {
      console.log("In read");
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );
      const promises = [];
      const from_date = myStartTime.plus({ hours: 0 }).toFormat(urlFormat);
      const to_date = myStartTime.plus({ minutes: 15 }).toFormat(urlFormat);

      const messpunkt_id = selectedMesspunkt.value.id;
      api
        .get(
          //`/tsdb/evaluation/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
          `/tsdb/more-mp/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
        )
        .then((response) => {
          console.log(response);
          console.log(response.data.filter((i) => i["rejected"] != null));

          const values = response.data;

          const layout = {
            title: `Messpunkt`,
            yaxis: {
              title: "Lr(A)",
              // range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
            },
            xaxis: {
              title: "Datum",
              type: "date",
            },
          };

          const data = [];
          const trace1 = {
            x: values.map((i) => i.time),
            y: values.map((i) => i.lafeq),
            name: `Relevanter Pegel`,
            mode: "lines+markers",
            marker: {
              size: 2,
            },
          };
          const trace2 = {
            x: values.map((i) => i.time),
            y: values.map((i) => i.rejected),
            name: `Sekunde nicht verwertbar`,
            mode: "lines+markers",
            marker: {
              size: 2,
            },
          };

          const trace3 = {
            x: values.map((i) => i.time),
            y: values.map((i) => i.detected),
            name: `Ereignis`,
            mode: "lines+markers",
            marker: {
              size: 2,
            },
          };
          data.push(trace1);
          data.push(trace2);
          data.push(trace3);
          // df[s].plot("plot_lr").line({ config, layout });
          Plotly.newPlot("plot-messpunkt", data, layout, plotly_config);
        });
    }

    const messpunktOptions = computed(() => {
      return store.project?.messpunkt_set;
    });

    const selectedMesspunkt = ref(null);

    return {
      selectedMesspunkt,
      messpunktOptions,
      read,
      selectedDate,
      selectedDatetime,
      addMinutes,
    };
  },
};
</script>
