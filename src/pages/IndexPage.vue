<template>
  <q-page class="flex flex-center">
    <q-btn label="read" @click="readData" />
    <q-btn label="aussortierung" @click="readAussortierugen" />
    <q-btn label="another" @click="anotherPlot" />
    <div id="plot_div"></div>
  </q-page>
</template>

<script>
import { defineComponent } from "vue";
import { readCSV, merge, DataFrame } from "danfojs";
import Plotly from "plotly.js-dist-min";

const { InfluxDB } = require("@influxdata/influxdb-client");

// You can generate an API token from the "API Tokens Tab" in the UI
const token =
  "6DeLFWxoSLGGZg5Yv2rpqUlaKJqaTio565N5EyS5AOrW-2KZ3u95AeeoVqorntQPgpiOgdVE7TqjQRn8qF0v9Q==";
const org = "kufi";
const bucket = "dauerauswertung_immendingen";

const client = new InfluxDB({ url: "http://localhost:8086", token: token });

export default defineComponent({
  name: "IndexPage",
  setup() {
    let myDF;
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

    async function readAussortierugen() {
      const queryApi = client.getQueryApi(org);

      const project_name = "mannheim";
      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: 2022-06-03T02:00:00Z, stop: 2022-06-03T02:10:00Z) |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_aussortierung")`;
      try {
        const data = await queryApi.collectRows(query);

        const df = new DataFrame(data);
        console.log(df);
      } catch (ex) {
        console.error(e);
      }
    }

    async function readData() {
      const queryApi = client.getQueryApi(org);

      const project_name = "mannheim";
      const query = `from(bucket: "dauerauswertung_immendingen") |> range(start: 2022-06-03T02:00:00Z, stop: 2022-06-03T02:10:00Z) |> filter(fn: (r) => r["_measurement"] == "messwerte_${project_name}_resu" and r["_field"] == "lafeq" and r["messpunkt"] == "Mannheim MP 2")`;
      try {
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
      } catch (e) {
        console.error(e);
        console.log("\nCollect ROWS ERROR");
      }
    }

    function anotherPlot() {
      if (myDF != null) {
        const x = myDF.index;
        const y = myDF["_value"].values;
        var trace1 = {
          x: x,
          y: y,
          mode: "lines+markers",
          marker: {
            color: "rgb(128, 0, 128)",
            size: 3,
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

        var data = [
          trace1,
          //trace2, trace3
        ];

        var layout = {
          title: "Line and Scatter Styling",
        };

        Plotly.newPlot("plot_div", data, layout);
      }
    }
    return {
      readData,
      readAussortierugen,
      anotherPlot,
    };
  },
});
</script>
