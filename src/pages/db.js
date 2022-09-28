const { InfluxDB } = require("@influxdata/influxdb-client");

const token =
  "6DeLFWxoSLGGZg5Yv2rpqUlaKJqaTio565N5EyS5AOrW-2KZ3u95AeeoVqorntQPgpiOgdVE7TqjQRn8qF0v9Q==";
const kuf_srv_token =
  "0ql08EobRW6A23j97jAkLyqNKIfQIKJS9_Wrw4mWIqBu795dl4cSfaykizl261h-QwY9BPDMUXbDCuFzlPQsfg==";
const org = "kufi";
const bucket = "dauerauswertung_immendingen";

const client = new InfluxDB({
  url: "http://localhost:8086",
  token: token,
});
const queryApi = client.getQueryApi(org);

import { readCSV, merge, DataFrame, query, Dt } from "danfojs";
import { DateTime } from "luxon";
import _ from "lodash";

const myFormat = "yyyy-MM-dd'T'HH:mm:ss";
const myFormatWithZ = "yyyy-MM-dd'T'HH:mm:ss'Z'";

function transform2CorrectDataFormat(arg) {
  console.log(arg);
  return DateTime.fromFormat(arg, myFormatWithZ).toFormat(myFormat);
}

async function readIO(myStartTime) {
  console.log(myStartTime);
  let myStartTimeString = myStartTime.toFormat(myFormatWithZ);
  let selected_io_id = 4;

  let myEndTime = myStartTime.plus({ hours: 24 }).toFormat(myFormatWithZ);

  const project_name = "mannheim";
  const query = `from(bucket: "dauerauswertung_immendingen")
  |> range(start: ${myStartTimeString}, stop: ${myEndTime})
  |> filter(fn: (r) => (r["_measurement"] == "auswertung_${project_name}_lr") and (r["immissionsort"] == "${selected_io_id}"))`;
  console.log("Query", query);
  try {
    let series_dict = {};
    const data = await queryApi.collectRows(query);

    console.log(data);
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

          series_dict[`${g}_${h[0]}`] = s_by_verursacher;

          console.log(dtS);
        }

        let moreData = {
          _value: [h[0] != 6 ? 38 : 50, h[0] != 6 ? 38 : 50],
          _time: [
            myStartTime.plus({ hours: h[0] }).toFormat(myFormat),
            myStartTime.plus({ hours: h[1] }).toFormat(myFormat),
          ],
        };

        let gw_df = new DataFrame(moreData);
        series_dict[`grenzwert_${h[0]}`] = gw_df.setIndex({ column: "_time" });

        console.log(series_dict);
      }

      return series_dict;
    } else {
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
        let moreData = {
          _value: [h[0] != 6 ? 38 : 50, h[0] != 6 ? 38 : 50],
          _time: [
            myStartTime.plus({ hours: h[0] }).toFormat(myFormat),
            myStartTime.plus({ hours: h[1] }).toFormat(myFormat),
          ],
        };

        let gw_df = new DataFrame(moreData);
        series_dict[`grenzwert_${h[0]}`] = gw_df.setIndex({ column: "_time" });
      }
      return series_dict;
    }

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
export { readIO, queryApi };
