<template>
  <q-page class="q-pa-md q-gutter-md">
    <div class="row q-gutter-sm">
      <q-btn label="-12h" @click="addMinutes(-12 * 60)" />
      <q-btn label="-1h" @click="addMinutes(-60)" />
      <q-btn label="-15min" @click="addMinutes(-15)" />
      <q-input type="datetime-local" v-model="selectedDatetime" step="1" />
      <q-btn label="+15min" @click="addMinutes(15)" />
      <q-btn label="+1h" @click="addMinutes(60)" />
      <q-btn label="+12h" @click="addMinutes(12 * 60)" />
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
        v-model="project.selected_mp"
        :options="project.mps"
        label="Messpunkt"
        class="col-3"
        option-label="name"
      />
    </div>
    <div class="row">
      <q-input type="number" v-model="maxYAxis" label="Max. Y-Achse" />
      <q-input type="number" v-model="intervalYAxis" label="Interval Y-Achse" />
    </div>
    <div class="row">
      <q-btn label="Aktualisieren" @click="readChartData" />
    </div>

    <div class="row">
      <div id="plot_div" class="col-10"></div>
    </div>
    <div class="row">
      <div id="plot_terz_div" class="col-10"></div>
    </div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { readCSV, merge, DataFrame } from "danfojs";
import Plotly from "plotly.js-dist-min";

import { DateTime } from "luxon";

import { config_immendingen, config_mannheim } from "./project.js";
import { ref, computed, watch } from "vue";
import _ from "lodash";
import { queryApi, plotly_config } from "./db.js";

config_immendingen["selected_mp"] = config_immendingen.mps[0];
config_mannheim["selected_mp"] = config_mannheim.mps[0];
export default defineComponent({
  name: "IndexPage",
  setup() {
    const name_resu_plot = "plot_div";

    const standard_layout_resu = {
      title: "LAFeq-Pegel-Zeitverlauf",
    };

    const myFormat = "yyyy-MM-dd'T'HH:mm:ss";
    const myFormatWithZ = "yyyy-MM-dd'T'HH:mm:ss'Z'";

    const mps = [2];

    let selectedDatetime = ref(
      DateTime.now().plus({ minutes: -30 }).toFormat("yyyy-MM-dd'T'HH:mm:ss")
      //2023-10-21T17:26:15
    );
    let myDF;
    let myDateTimeStartString = "2022-09-20T02:00:00Z";
    let myDateTimeStopString = "2022-09-20T02:30:00Z";

    let selectedDatetimeFloor = computed(() => {
      let dt = DateTime.fromFormat(selectedDatetime.value, myFormat);

      return dt
        .plus({ minutes: -dt.minute % 15, seconds: -dt.second })
        .toFormat(myFormat);
    });

    function bla(args) {
      if (args.length >= 10) {
        return args[5];
      } else return NaN;
    }

    async function readChartData() {
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );

      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

      let myEndTime = myStartTime.plus({ minutes: 15 }).toFormat(myFormatWithZ);

      console.log(project.value.selected_mp.name_in_api);

      const query_resu = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTime}) |> filter(fn: (r) => r["_measurement"] == "messwerte_${project_name}_resu" and r["_field"] == "lafeq" and r["messpunkt"] == "${project.value.selected_mp.name_in_api}")`;
      console.log(query_resu);
      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTime}) |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_aussortierung")`;

      const fluxQueryErkennung = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_erkennung")
 |> sort(columns: ["_time"], desc: false)`;
      console.log(fluxQueryErkennung);
      try {
        const data_resu = await queryApi.collectRows(query_resu);
        const df_resu = new DataFrame(data_resu);

        const data_aussortierung = await queryApi.collectRows(query);
        let data;

        const data_erkennung = await queryApi.collectRows(fluxQueryErkennung);
        const df_erkennung = new DataFrame(data_erkennung);

        console.log("df_erkennung", df_erkennung);

        if (data_resu.length == 0) {
          throw new Error("No data available");
        } else if (data_aussortierung.length == 0) {
          console.log("Keine Aussortierungen vorhanden");
          const df_indexed = df_resu.setIndex({ column: "_time" });
          let trace2 = {
            x: df_resu["_time"].values,
            y: df_resu["_value"].values,
            name: "LAFeq",
            mode: "lines",
            line: {
              color: "red",
              width: 2,
            },
          };

          data = [trace2];
        } else {
          const df = new DataFrame(data_aussortierung);
          let merge_df = merge({
            left: df_resu,
            right: df,
            on: ["_time"],
            how: "left",
          });

          console.log("Groups: ", df_erkennung.groupby(["_time"]));

          if (false) {
            let another_merge_df = merge({
              left: merge_df,
              right: df_erkennung,
              on: ["_time"],
              how: "left",
            });

            console.log("another_merge_df", another_merge_df);
          }

          merge_df = merge_df.setIndex({ column: "_time" });
          let erkennungen = merge_df.apply(bla, { axis: 1 });

          console.log(merge_df.index);
          const x = merge_df.index;
          const y = erkennungen.values;
          let trace1 = {
            x: x,
            y: y,
            mode: "lines+markers",
            marker: {
              color: "blue",
              size: 2,
            },
            name: "Aussortiert",
            line: {
              color: "blue",
              width: 2,
            },
          };

          let trace2 = {
            x: merge_df.index,
            y: merge_df["_value"].values,
            name: "LAFeq",
            mode: "lines",
            line: {
              color: "red",
              width: 2,
            },
          };

          data = [trace2, trace1];
          console.log(merge_df);
        }

        let layout = {
          ...standard_layout_resu,
          xaxis: {
            title: "Zeitpunkt",
            type: "date",

            // range: [myStartTimeString, myEndTime],
          },
          yaxis: {
            title: "LAFeq",
            range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
          },
        };

        Plotly.newPlot("plot_div", data, layout, plotly_config);
      } catch (ex) {
        console.error(ex);
        let data = [
          // trace3
        ];

        let layout = {
          title: "LAFeq-Pegel-Zeitverlauf",
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
          xaxis: {
            title: "Date",
            range: [myStartTimeString, myEndTime],
            type: "date",
          },
          yaxis: {
            title: "LAFeq",
            range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
          },
        };

        Plotly.newPlot("plot_div", data, layout, plotly_config);
      }
    }

    function addMinutes(noMinutes) {
      let myStartTime = DateTime.fromFormat(selectedDatetime.value, myFormat);

      selectedDatetime.value = myStartTime
        .plus({ minutes: noMinutes })
        .toFormat(myFormat);
    }

    watch(selectedDatetime, (newVal) => {
      console.log(newVal);
      readChartData();

      readTerz();
    });

    async function readTerz() {
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );

      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

      let myEndTimeString = myStartTime
        .plus({ minutes: 15 })
        .toFormat(myFormatWithZ);

      const frequencies = [
        "hz20",
        "hz25",
        "hz31_5",
        "hz40",
        "hz50",
        "hz63",
        "hz80",
        "hz100",
        "hz125",
        "hz160",
        "hz200",
        "hz250",
        "hz315",
        "hz400",
        "hz500",
        "hz630",
        "hz800",
        "hz1000",
        "hz1250",
        "hz1600",
        "hz2000",
        "hz2500",
        "hz3150",
        "hz4000",
        "hz5000",
        "hz6300",
        "hz8000",
        "hz10000",
        "hz12500",
        "hz16000",
        "hz20000",
      ];

      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTimeString}) |> filter(fn: (r) => r["_measurement"] == "messwerte_${project_name}_terz" and r["messpunkt"] == "${project.value.selected_mp.name_in_api}")`;
      const myTimePoint = DateTime.fromFormat(selectedDatetime.value, myFormat);
      try {
        console.log(query);
        const data = await queryApi.collectRows(query);

        if (data.length == 0) {
          throw new Error("No data available");
        }

        let grouped = _.groupBy(data, "_time");
        let target = {};
        for (let g in grouped) {
          target[g] = [];
          for (let f of frequencies) {
            let pegel = grouped[g].find((i) => i._field == f);
            if (pegel != null) {
              if (pegel["_value"] == null) {
                console.log("Missing at", g);
              }
              target[g].push(pegel["_value"]);
            } else {
              throw new Error(`${f} is missing`);
            }
          }
        }

        const y = target[myTimePoint.toFormat(myFormatWithZ)];
        let trace1 = {
          x: frequencies,
          y: y,
          // mode: "lines+markers",
          type: "bar",
        };

        let terzData = [
          trace1,
          //trace2, trace3
        ];

        let layout = {
          title: `Terz-Spektrum: ${myTimePoint.toFormat(myFormatWithZ)}`,
        };

        Plotly.newPlot("plot_terz_div", terzData, layout, { responsive: true });

        console.log(terzData);
      } catch (e) {
        console.error(e);

        let layout = {
          title: `Terz-Spektrum: ${myTimePoint.toFormat(myFormatWithZ)}`,
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
          yaxis: {
            title: "LZFeq",
            range: [0, 60],
          },
        };

        let trace1 = {
          x: frequencies,
          y: frequencies.map((i) => 0),
          // x: ["X"],
          // y: [0],
          // mode: "lines+markers",
          type: "bar",
        };

        Plotly.newPlot("plot_terz_div", [trace1], layout, { responsive: true });
      }
    }

    const maxYAxis = ref(80);
    const intervalYAxis = ref(60);

    watch([maxYAxis, intervalYAxis], (newVal) => {
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );

      const graphDiv = document.getElementById(name_resu_plot);
      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

      let myEndTime = myStartTime.plus({ minutes: 15 }).toFormat(myFormatWithZ);

      let layout = {
        ...standard_layout_resu,
        xaxis: {
          title: "Date",
          type: "date",

          // range: [myStartTimeString, myEndTime],
        },
        yaxis: {
          title: "LAFeq",
          range: [maxYAxis.value - intervalYAxis.value, maxYAxis.value],
        },
      };

      Plotly.relayout(graphDiv, layout);
    });

    const projects = [config_immendingen, config_mannheim];
    const project = ref(projects[0]);

    const project_name = project.value.bezeichnung;

    const selectedMesspunkt = ref(project.value.mps[0]);
    return {
      project,
      readChartData,
      readTerz,
      mps,
      selectedDatetime,
      selectedDatetimeFloor,
      addMinutes,
      selectedMesspunkt,
      maxYAxis,
      intervalYAxis,
      projects,
    };
  },
});
</script>
