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
    <div class="row q-gutter-sm">
      <q-input type="number" v-model.number="maxYAxis1" label="Max. Y-Achse" />
      <q-input
        type="number"
        v-model.number="intervalYAxis1"
        label="Intervall Y-Achse"
      />
      <q-input
        type="number"
        v-model.number="maxYAxis2"
        label="Max. Y-Achse Terze"
      />
      <q-input
        type="number"
        v-model.number="intervalYAxis2"
        label="Intervall Y-Achse Terze"
      />
    </div>

    <div class="row q-gutter-sm">
      <q-select
        class="col-3"
        v-model="selectedMesspunkt"
        option-label="name"
        :options="messpunktOptions"
        label="Messpunkt"
      />
      <q-btn label="Daten laden" @click="read" />
    </div>
    <div id="plot-messpunkt" />
    <div id="plot-terz" />
  </q-page>
</template>

<script>
const urlFormat = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss";

import Plotly from "plotly.js-dist-min";
import { api } from "../boot/axios";
import { DateTime } from "luxon";
import { ref, computed, watch, onErrorCaptured } from "vue";
import {
  readIO,
  myFormat,
  shortFormat,
  plotly_config,
  myFormatWithZ,
  start_end_times,
  standard_layout_lr,
  frequencies,
  frequencies_fields,
} from "./db.js";
import { useCounterStore } from "../stores/example-store";
import { useQuasar } from "quasar";
import locale from "plotly.js-locales/de";

// then
Plotly.register(locale);


export default {
  // name: 'PageName',
  setup() {
    const $q = useQuasar();
    const selectedDate = ref(DateTime.now().toFormat(shortFormat));
    const laermursachen = ref([]);
    const store = useCounterStore();

    const intervalYAxis1 = ref(60);
    const maxYAxis1 = ref(60);

    const intervalYAxis2 = ref(60);
    const maxYAxis2 = ref(60);

    const selectedDatetime = computed({
      get: () => store.selectedDatetime.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      set: (val) => {
        console.log("Setter is called", val);
        store.$patch({
          selectedDatetime: DateTime.fromFormat(val, "yyyy-MM-dd'T'HH:mm:ss"),
        });
      },
    });

    function updatePlotlyLayout(target, args) {
      const graphDiv = document.getElementById(target);
      console.log("Before error?");
      Plotly.relayout(graphDiv, args);
    }

    /*ref(
      DateTime.now().plus({ minutes: -30 }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
      //2023-10-21T17:26:15
    )*/ const selectedDatetimeFloor = computed(() => {
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
      $q.loading.show();
      console.log("In read");
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );
      const promises = [];
      const from_date = myStartTime.plus({ hours: 0 }).toFormat(urlFormat);
      const to_date = myStartTime.plus({ minutes: 15 }).toFormat(urlFormat);

      const messpunkt_id = selectedMesspunkt.value.id;
      const p1 = api
        .get(
          //`/tsdb/evaluation/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
          `/tsdb/more-mp/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}&projekt=${store.project.id}`
        )
        .then((response) => {
          console.log(response);
          console.log(response.data.filter((i) => i["rejected"] != null));

          const values = response.data;

          const layout = {
            title: `${selectedMesspunkt.value.name}`,
            yaxis: {
              title: "LAFeq",
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
      const p2 = api
        .get(
          //`/tsdb/evaluation/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
          `/tsdb/terz/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
        )
        .then((response) => {
          console.log(response);
          const layout = {
            title: `Terzfrequenzen um ${store.selectedDatetime.toFormat(
              "HH:mm:ss"
            )}`,
            yaxis: {
              title: "LZ",
              // range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
            },
          };
          const corresponding_terz = response.data.find(
            (i) =>
              i.time.substring(0, 19) ===
              store.selectedDatetime.toFormat("yyyy-MM-dd'T'HH:mm:ss")
          );
          console.log(corresponding_terz);
          const frequenciesWithsValues = [];
          try {
            for (let f of frequencies_fields) {
              frequenciesWithsValues.push(corresponding_terz[f]);
            }
            const data = [
              {
                x: frequencies,
                y: frequenciesWithsValues,
                type: "bar",
              },
            ];
            Plotly.newPlot("plot-terz", data, layout, plotly_config);
            updatePlotlyLayout("plot-terz", {
              "yaxis.range": [
                maxYAxis2.value - intervalYAxis2.value,
                maxYAxis2.value,
              ],
            });
          } catch (ex) {
            Plotly.newPlot("plot-terz", [], layout, plotly_config);
          }
        });
      return Promise.all([p1, p2])
        .catch((e) => {
          console.log(e);

          throw e;
        })
        .finally(() => $q.loading.hide());
    }

    onErrorCaptured((err, instance, info) => {
      console.log(err, instance, info);
      $q.notify({
        message: `Fehler beim Laden der Daten: ${err}`,
        type: "negative",
      });
    });

    const messpunktOptions = computed(() => {
      return store.project?.messpunkt_set;
    });

    const selectedMesspunkt = computed({
      get: () => store.selectedMesspunkt,
      set: (val) => {
        store.$patch({
          selectedMesspunkt: val,
        });
      },
    });

    return {
      selectedMesspunkt,
      messpunktOptions,
      read,
      selectedDate,
      selectedDatetime,
      addMinutes,
      intervalYAxis1,
      maxYAxis1,
      intervalYAxis2,
      maxYAxis2,
    };
  },
};
</script>
