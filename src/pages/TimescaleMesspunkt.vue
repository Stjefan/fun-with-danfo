<template>
  <q-page padding>
    <!-- content -->
    <div class="row q-gutter-sm">
      <q-btn
        label="-12h"
        @click="addMinutes(-12 * 60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-btn
        label="-1h"
        @click="addMinutes(-60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-btn
        label="-15min"
        @click="addMinutes(-15)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-input type="datetime-local" v-model="selectedDatetime" step="1" />
      <q-btn
        label="+15min"
        @click="addMinutes(15)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-btn
        label="+1h"
        @click="addMinutes(60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <q-btn
        label="+12h"
        @click="addMinutes(12 * 60)"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
      />
      <div class="col-1" />

      <q-select
        class="col-3"
        v-model="selectedMesspunkt"
        option-label="name"
        :options="messpunktOptions"
        label="Messpunkt"
      />
    </div>
    <div class="row q-gutter-sm justify-start">
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

    <div class="row">
      <q-btn
        icon="refresh"
        style="margin-top: 10px; margin-bottom: 10px"
        outline
        @click="read"
      />
    </div>

    <div id="plot-messpunkt" />
    <div id="plot-terz" />
  </q-page>
</template>

<script>
const urlFormat = "yyyy-MM-dd'T'HH'%3A'mm'%3A'ss";

import Plotly from "plotly.js-dist-min";
import { api } from "../boot/axios";
import { DateTime, Settings } from "luxon";
import { ref, computed, watch, onErrorCaptured, onMounted } from "vue";
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
    const store = useCounterStore();

    const intervalYAxis1 = computed({
      get: () => store.intervalYAxisMesspunkt,
      set: (val) => {
        store.$patch({
          intervalYAxisMesspunkt: val,
        });
      },
    });
    const maxYAxis1 = computed({
      get: () => store.maxYAxisMesspunkt,
      set: (val) => {
        store.$patch({
          maxYAxisMesspunkt: val,
        });
      },
    });
    const intervalYAxis2 = computed({
      get: () => store.intervalYAxisTerz,
      set: (val) => {
        store.$patch({
          intervalYAxisTerz: val,
        });
      },
    });
    const maxYAxis2 = computed({
      get: () => store.maxYAxisTerz,
      set: (val) => {
        store.$patch({
          maxYAxisTerz: val,
        });
      },
    });

    const loading1 = ref(false);
    const loading2 = ref(false);

    Settings.throwOnInvalid = true;

    const selectedDatetime = computed({
      get: () => store.selectedDatetime.toFormat("yyyy-MM-dd'T'HH:mm:ss"),
      set: (val) => {
        console.log("Setter is called", val);
        try {
          const parsedDatetime = DateTime.fromFormat(
            val,
            "yyyy-MM-dd'T'HH:mm:ss"
          );
          console.log("Should not be visibile, if casting fails");
          store.$patch({
            selectedDatetime: parsedDatetime,
          });
        } catch (e) {
          console.log("Parsing failed. Try another parser", e);
          try {
            const parsedDatetime = DateTime.fromFormat(
              val,
              "yyyy-MM-dd'T'HH:mm"
            );
            store.$patch({
              selectedDatetime: parsedDatetime,
            });
          } catch (e) {
            console.log("Parsing failed again. Try another parser", e);
          }
        }
      },
    });

    function updatePlotlyLayout(target, args) {
      console.log("Updating layout");
      const graphDiv = document.getElementById(target);
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
      console.log("In read");
      loadPegelZeitverlauf();
      loadTerzpegel();
    }

    onErrorCaptured((err, instance, info) => {
      console.log(err, instance, info);
      $q.notify({
        message: `Fehler beim Laden der Daten: ${err}`,
        type: "negative",
      });
      loading1.value = false;
      loading2.value = false;
      $q.loading.hide();
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
    watch([maxYAxis1, intervalYAxis1], (val) => {
      updatePlotlyLayout("plot-messpunkt", {
        "yaxis.range": [
          maxYAxis1.value - intervalYAxis1.value,
          maxYAxis1.value,
        ],
      });
    });

    watch([maxYAxis2, intervalYAxis2], (val) => {
      updatePlotlyLayout("plot-terz", {
        "yaxis.range": [
          maxYAxis2.value - intervalYAxis2.value,
          maxYAxis2.value,
        ],
      });
    });

    watch([selectedDatetimeFloor, selectedMesspunkt], (val) => {
      loadPegelZeitverlauf();
    });

    watch([loading1, loading2], (val) => {
      if (loading1.value || loading2.value) $q.loading.show();
      else $q.loading.hide();
    });

    function loadPegelZeitverlauf() {
      loading1.value = true;
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );
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
            legend: { orientation: "h" },
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
          updatePlotlyLayout("plot-messpunkt", {
            "yaxis.range": [
              maxYAxis1.value - intervalYAxis1.value,
              maxYAxis1.value,
            ],
          });
        })
        .finally(() => {
          loading1.value = false;
        });
    }

    watch([selectedDatetime, selectedMesspunkt], (val) => {
      loadTerzpegel();
    });

    function loadTerzpegel() {
      loading2.value = true;
      const messpunkt_id = selectedMesspunkt.value.id;
      const p2 = api
        .get(
          //`/tsdb/evaluation/?time_after=${from_date}&time_before=${to_date}&messpunkt=${messpunkt_id}`
          `/tsdb/terz/?time_after=${store.selectedDatetime.toFormat(
            urlFormat
          )}&time_before=${store.selectedDatetime.toFormat(
            urlFormat
          )}&messpunkt=${messpunkt_id}`
        )
        .then((response) => {
          console.log(response);
          const layout = {
            title: `Terzfrequenzen an ${
              selectedMesspunkt.value.name
            } um ${store.selectedDatetime.toFormat("HH:mm:ss")}`,
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
          } finally {
            loading2.value = false;
          }
        });
    }

    onMounted(() => {
      //loadPegelZeitverlauf();
      // loadTerzpegel();
    });

    return {
      selectedMesspunkt,
      messpunktOptions,
      read,
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
