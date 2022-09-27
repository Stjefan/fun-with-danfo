<template>
  <q-page>
    <div class="row q-pa-md q-gutter-md">
      <q-btn label="-12h" @click="addMinutes(-12 * 60)" />
      <q-btn label="-1h" @click="addMinutes(-60)" />
      <q-btn label="-15min" @click="addMinutes(-15)" />
      <q-input type="datetime-local" v-model="selectedDatetime" step="1" />
      <q-btn label="+15min" @click="addMinutes(15)" />
      <q-btn label="+1h" @click="addMinutes(60)" />
      <q-btn label="+12h" @click="addMinutes(12 * 60)" />
    </div>
    <div class="row">
      <q-select v-model="selectedMesspunkt" />
    </div>
    <div class="row">
      <q-btn label="read" @click="readData" />
      <q-btn label="aussortierung" @click="readAussortierugen" />
      <q-btn label="another" @click="anotherPlot" />
      <q-btn label="Terz" @click="readTerz" />
    </div>

    <div class="row">
      <div id="plot_div" class="col-6"></div>
      <div id="plot_terz_div" class="col-6"></div>
    </div>
    <div class="row"></div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { readCSV, merge, DataFrame } from "danfojs";
import Plotly from "plotly.js-dist-min";

import { DateTime } from "luxon";

import { ref, computed, watch } from "vue";
import _ from "lodash";
const { InfluxDB } = require("@influxdata/influxdb-client");

// You can generate an API token from the "API Tokens Tab" in the UI
const token =
  "6DeLFWxoSLGGZg5Yv2rpqUlaKJqaTio565N5EyS5AOrW-2KZ3u95AeeoVqorntQPgpiOgdVE7TqjQRn8qF0v9Q==";
const kuf_srv_token =
  "0ql08EobRW6A23j97jAkLyqNKIfQIKJS9_Wrw4mWIqBu795dl4cSfaykizl261h-QwY9BPDMUXbDCuFzlPQsfg==";
const org = "kufi";
const bucket = "dauerauswertung_immendingen";

const client = new InfluxDB({
  url: "http://localhost:8086",
  token: kuf_srv_token,
});

export default defineComponent({
  name: "IndexPage",
  setup() {
    const queryApi = client.getQueryApi(org);
    const project_name = "mannheim";

    const myFormat = "yyyy-MM-dd'T'HH:mm:ss";
    const myFormatWithZ = "yyyy-MM-dd'T'HH:mm:ss'Z'";

    const selectedMesspunkt = ref("Mannheim MP 2");

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
    readCSV(
      "https://raw.githubusercontent.com/plotly/datasets/master/finance-charts-apple.csv"
    )
      .then((df) => {
        let layout = {
          title: "A financial charts",
          xaxis: {
            title: "Date",
          },
          yaxis: {
            title: "Count",
          },
        };

        let config = {
          columns: ["AAPL.Open", "AAPL.High", "AAPL.Open_1"],
        };

        let new_df = df.setIndex({ column: "Date" });

        let sub_df = df.iloc({
          rows: [5, 6, 7, 8, 10, 11, 12, 13, 20, 21, 22, 25, 27, 29, 30],
        });

        let merge_df = merge({
          left: new_df,
          right: sub_df,
          on: ["Date"],
          how: "left",
        });

        console.log(merge_df);

        merge_df.plot("plot_div").line();
        //.line({ config, layout });
        // sub_df.print();
      })
      .catch((err) => {
        console.log(err);
      });

    function bla(args) {
      if (args.length >= 10) {
        return args[5];
      } else return NaN;
    }

    async function readAussortierugen() {
      const queryApi = client.getQueryApi(org);

      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );

      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

      let myEndTime = myStartTime.plus({ minutes: 15 }).toFormat(myFormatWithZ);

      const project_name = "mannheim";
      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTime}) |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_aussortierung")`;
      try {
        const data = await queryApi.collectRows(query);

        const df = new DataFrame(data);
        console.log(myDF, df);

        let merge_df = merge({
          left: myDF,
          right: df,
          on: ["_time"],
          how: "left",
        });

        console.log(merge_df);

        merge_df = merge_df.setIndex({ column: "_time" });

        let erkennungen = merge_df.apply(bla, { axis: 1 });

        if (true) {
          const x = erkennungen.index;
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
          /*

      var trace3 = {
        x: [1, 2, 3, 4],
        y: [12, 9, 15, 12],
        mode: "lines+markers",
        marker: {
          color: "rgb(128, 0, 128)",
          size: 8,
        },
        line: {
          color: "rgb(128, 0, 128)",
          width: 1,
        },
      };

      */

          let data = [
            trace2,
            trace1,
            // trace3
          ];

          let layout = {
            title: "LAFeq-Pegel-Zeitverlauf",
          };

          Plotly.newPlot("plot_div", data, layout);
        } else {
          merge_df.plot("plot_div").line({
            config: {
              columns: ["_value", "_value_1"],
            },
            layout: {
              title: "Detections",
              xaxis: {
                title: "Date",
              },
              yaxis: {
                title: "LAFeq",
              },
            },
          });
        }
      } catch (ex) {
        console.error(ex);
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
      readData();

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

      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTimeString}) |> filter(fn: (r) => r["_measurement"] == "messwerte_${project_name}_terz" and r["messpunkt"] == "Mannheim MP 2")`;
      try {
        console.log(query);
        const data = await queryApi.collectRows(query);

        let grouped = _.groupBy(data, "_time");
        let target = {};
        for (let g in grouped) {
          target[g] = [];
          for (let f of frequencies) {
            let pegel = grouped[g].find((i) => i._field == f);
            if (pegel != null) {
              target[g].push(pegel["_value"]);
            } else {
              throw new Error(`${f} is missing`);
            }
          }
        }

        console.log(target);

        const x = frequencies;
        const myTimePoint = DateTime.fromFormat(
          selectedDatetime.value,
          myFormat
        );

        const y = target[myTimePoint.toFormat(myFormatWithZ)];
        let trace1 = {
          x: x,
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

        Plotly.newPlot("plot_terz_div", terzData, layout);

        if (false) {
          const df = new DataFrame(data);

          console.log(df);

          let new_df = df.setIndex({ column: "table" });
          console.log(new_df);

          let layout = {
            title: "A financial charts",
            xaxis: {
              title: "Date",
            },
            yaxis: {
              title: "Count",
            },
          };

          let config = {
            columns: ["_value"],
          };

          new_df.plot("plot_div").line({ config, layout });

          console.log("\nCollect ROWS SUCCESS");
          myDF = new_df;
        }
      } catch (e) {
        console.error(e);
        console.log("\nCollect ROWS ERROR");
      }
    }

    async function readData() {
      let myStartTime = DateTime.fromFormat(
        selectedDatetimeFloor.value,
        myFormat
      );

      let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

      let myEndTimeString = myStartTime
        .plus({ minutes: 15 })
        .toFormat(myFormatWithZ);

      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: ${myStartTimeString}, stop: ${myEndTimeString}) |> filter(fn: (r) => r["_measurement"] == "messwerte_${project_name}_resu" and r["_field"] == "lafeq" and r["messpunkt"] == "Mannheim MP 2")`;
      try {
        console.log(query);
        const data = await queryApi.collectRows(query);

        const df = new DataFrame(data);

        if (false) {
          data.forEach((x) =>
            // console.log(JSON.stringify(x))
            console.log(x["_time"], x["_value"])
          );
        }

        let new_df = df.setIndex({ column: "_time" });
        console.log(new_df);

        let layout = {
          title: "A financial charts",
          xaxis: {
            title: "Date",
          },
          yaxis: {
            title: "Count",
          },
        };

        let config = {
          columns: ["_value"],
        };

        new_df.plot("plot_div").line({ config, layout });

        console.log("\nCollect ROWS SUCCESS");

        myDF = new_df;
        readAussortierugen();
      } catch (e) {
        console.error(e);
        console.log("\nCollect ROWS ERROR");
      }
    }

    function anotherPlot() {
      if (myDF != null) {
        const x = myDF.index;
        const y = myDF["_value"].values;
        let trace1 = {
          x: x,
          y: y,
          // mode: "lines+markers",
          marker: {
            color: "rgb(128, 0, 128)",
            size: 1,
          },
          line: {
            color: "rgb(128, 0, 128)",
            width: 1,
          },
        };

        /*

      var trace2 = {
        x: [2, 3, 4, 5],
        y: [16, 5, 11, 9],
        mode: "lines",
        line: {
          color: "rgb(55, 128, 191)",
          width: 3,
        },
      };

      var trace3 = {
        x: [1, 2, 3, 4],
        y: [12, 9, 15, 12],
        mode: "lines+markers",
        marker: {
          color: "rgb(128, 0, 128)",
          size: 8,
        },
        line: {
          color: "rgb(128, 0, 128)",
          width: 1,
        },
      };

      */

        let data = [
          trace1,
          //trace2, trace3
        ];

        let layout = {
          title: "Line and Scatter Styling",
        };

        Plotly.newPlot("plot_div", data, layout);
      }
    }
    return {
      readTerz,
      readData,
      readAussortierugen,
      anotherPlot,
      selectedDatetime,
      selectedDatetimeFloor,
      addMinutes,
      selectedMesspunkt,
    };
  },
});
</script>
