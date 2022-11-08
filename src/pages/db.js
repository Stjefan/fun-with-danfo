const { InfluxDB } = require("@influxdata/influxdb-client");

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
const queryApi = client.getQueryApi(org);

import { readCSV, merge, DataFrame, query, Dt } from "danfojs";
import { DateTime } from "luxon";
import _ from "lodash";

const myFormat = "yyyy-MM-dd'T'HH:mm:ss";
const myFormatWithZ = "yyyy-MM-dd'T'HH:mm:ss'Z'";
const shortFormat = "yyyy-MM-dd";

function transform2CorrectDataFormat(arg) {
  console.log(arg);
  return DateTime.fromFormat(arg, myFormatWithZ).toFormat(myFormat);
}

async function readDashboardInformation() {
  const myStartTime = DateTime.fromFormat("2022-09-30", shortFormat);
  const id_immissionsort = 4;
  const project_name = "mannheim";
  let myStartTimeString = myStartTime.toFormat(myFormatWithZ);
  let myEndTime = myStartTime.plus({ hours: 24 }).toFormat(myFormatWithZ);

  const query = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_lr" and r["verursacher"] == "gesamt" and r["immissionsort"] == "${id_immissionsort}") |> aggregateWindow(every: 1h, fn: max, createEmpty: false)`;

  const query_lauteste_stunde_tag = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => r["_measurement"] == "auswertung_${project_name}_lauteste_stunde") |> aggregateWindow(every: 1h, fn: max, createEmpty: false)`;

  const data = await queryApi.collectRows(query);

  console.log(data);

  let lr_df = new DataFrame(data);

  console.log(lr_df);

  const data2 = await queryApi.collectRows(query_lauteste_stunde_tag);

  console.log(data2);

  let lauteste_stunde_df = new DataFrame(data2);

  console.log(lauteste_stunde_df);
}

async function readIO(myStartTime, io, project_name) {
  console.log(myStartTime);
  let myStartTimeString = myStartTime.toFormat(myFormatWithZ);

  let selected_io_id = io.id;

  let myEndTime = myStartTime.plus({ hours: 24 }).toFormat(myFormatWithZ);

  // const project_name = "mannheim";
  const query = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => (r["_measurement"] == "auswertung_${project_name}_lr") and (r["immissionsort"] == "${selected_io_id}"))`;
  console.log("Query", query);
  try {
    let series_dict = {};
    const data = await queryApi.collectRows(query);

    console.log(data);
    for (let h of [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 22],
      [22, 23],
      [23, 24],
    ]) {
      series_dict[`${h[0]}`] = {};
      let moreData = {
        _value: [
          h[0] != 6 ? io.gw_nacht : io.gw_tag,
          h[0] != 6 ? io.gw_nacht : io.gw_tag,
        ],
        _time: [
          myStartTime.plus({ hours: h[0] }).toFormat(myFormat),
          myStartTime.plus({ hours: h[1] }).toFormat(myFormat),
        ],
      };

      let gw_df = new DataFrame(moreData);
      console.log(series_dict);
      series_dict[`${h[0]}`][`grenzwert`] = gw_df.setIndex({
        column: "_time",
      });
    }

    if (data.length != 0) {
      let df = new DataFrame(data);

      let df_modified = df["_time"].apply(transform2CorrectDataFormat, {
        axis: 1,
      });
      console.log(df_modified);

      df = df.addColumn("more_time", df_modified.values, df_modified.index);

      const dtS = new Dt(df["more_time"]);

      for (let h of [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [5, 6],
        [6, 22],
        [22, 23],
        [23, 24],
      ]) {
        let groups = df.groupby(["verursacher"]).colDict;
        for (let g in groups) {
          let tranformed_to_utc_start = h[0];
          let tranformed_to_utc_end = h[1];
          console.log(tranformed_to_utc_end, tranformed_to_utc_start);
          let df_sorted = df.query(
            dtS
              .hours()
              .lt(tranformed_to_utc_end)
              .and(dtS.hours().ge(tranformed_to_utc_start))
              .and(df["verursacher"].eq(g))
          );
          console.log(df_sorted);

          /*
      const anotherDf = new DataFrame(
        { filter: hourFilter.values },
        { index: series_dict[g].index }
      );
      */
          // s.addColumn("hours", tmp, { inplace: true });

          let s_by_verursacher = df_sorted.setIndex({ column: "_time" });

          series_dict[`${h[0]}`][`${g}`] = s_by_verursacher;

          console.log(dtS);
        }
      }
      console.log(series_dict);
    }

    return series_dict;

    if (false) {
      let merge_df = merge({
        left: myDF,
        right: df,
        on: ["_time"],
        how: "left",
      });

      console.log(merge_df);

      merge_df = merge_df.setIndex({ column: "_time" });
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
    }
  } catch (err) {
    console.log(err);
  }
}

var plotly_config = { responsive: true, locale: "de" };

const start_end_times = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 22],
  [22, 23],
  [23, 24],
];

const standard_layout_lr = {
  title: "Beurteilungspegel",
  xaxis: {
    title: "Datum",
  },
};

const frequencies = [
  "20.00 Hz",
  "25.00 Hz",
  "31.50 Hz",
  "40.00 Hz",
  "50.00 Hz",
  "63.00 Hz",
  "80.00 Hz",
  "100.00 Hz",
  "125.00 Hz",
  "160.00 Hz",
  "200.00 Hz",
  "250.00 Hz",
  "315.00 Hz",
  "400.00 Hz",
  "500.00 Hz",
  "630.00 Hz",
  "800.00 Hz",
  "1000.00 Hz",
  "1.25 kHz",
  "1.60 kHz",
  "2.00 kHz",
  "2.50 kHz",
  "3.15 kHz",
  "4.00 kHz",
  "5.00 kHz",
  "6.30 kHz",
  "8.00 kHz",
  "10.00 kHz",
  "12.50 kHz",
  "16.00 kHz",
  "20.00 kHz",
  // "Gesamt",
];

const frequencies_fields = [
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
export {
  standard_layout_lr,
  readIO,
  queryApi,
  myFormat,
  myFormatWithZ,
  shortFormat,
  plotly_config,
  readDashboardInformation,
  start_end_times,
  frequencies,
  frequencies_fields,
};
