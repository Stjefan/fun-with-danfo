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

async function readIO(myStartTime) {
  console.log(myStartTime);
  let myStartTimeString = myStartTime.toFormat(myFormatWithZ);
  let selected_io_id = 4;

  let myEndTime = myStartTime.plus({ hours: 24 }).toFormat(myFormatWithZ);

  const project_name = "mannheim";
  const query = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => (r["_measurement"] == "auswertung_${project_name}_lr") and (r["immissionsort"] == "${selected_io_id}"))`;
  try {
    const data = await queryApi.collectRows(query);

    console.log(data);

    let df = new DataFrame(data);

    let uniqueItems = [...new Set([3, 5, 2, 10, 5, 2, 3])];
    console.log(uniqueItems);

    let groups = df.groupby(["verursacher"]).colDict;

    let series_dict = {};

    for (let g in groups) {
      console.log(g, df.query(df["_value"].gt(42)));
      let s = df
        .query(df["verursacher"].eq(g))
        .loc({ columns: ["_time", "_value"] });

      const dtS = new Dt(s["_time"]);
      const hourFilter = dtS.hours().eq(2);
      console.log(s);
      /*
      const anotherDf = new DataFrame(
        { filter: hourFilter.values },
        { index: series_dict[g].index }
      );
      */
      let tmp = hourFilter.values;

      console.log(s.iloc({ rows: [0, 1, 2] }));
      // s.addColumn("hours", tmp, { inplace: true });

      let s_by_verursacher = s.setIndex({ column: "_time" });

      series_dict[g] = s_by_verursacher;

      console.log(dtS);
    }

    let moreData = {
      _value: [50, 50],
      _time: [myStartTimeString, myEndTime],
    };

    let gw_df = new DataFrame(moreData);
    series_dict["grenzwert"] = gw_df.setIndex({ column: "_time" });

    console.log(series_dict);

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
export { readIO };
