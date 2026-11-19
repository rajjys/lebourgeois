/**
 * CAA weekly timetable dated 16/11/2026, typed in by hand from
 * https://www.caacongo.com/horaires_16_11_26.pdf (published 2026-11-17, read 2026-11-19; 5 pages,
 * Monday to Sunday, the fifth blank). One row per day and leg, as printed. Local times at each airport.
 *
 * - Monday: "A330 OFF", so no 1611/1612 that day.
 * - The A330 flies 1611-1614; every other rotation is an A320 (9S-ABM, 9S-AJS and 9S-ABI are named).
 * - New since 11 Nov: 1672/1671 Lubumbashi-Kinshasa (Monday; 1672 alone on Saturday) and a Friday
 *   rotation 1255 Kinshasa-Kindu-Kisangani-Kinshasa. Wednesday's Kananga flights moved to the evening.
 * - Every row was checked against its printed block time and the airports' time zones (Kinshasa and
 *   Mbandaka UTC+1, the others UTC+2). One does not add up and is kept as printed: Wednesday 1257
 *   Kinshasa 09:00 → Kindu 11:00 with a 02:00 block (that would be 12:00); the next leg leaves Kindu
 *   at 11:45, so the error may be the departure instead. Thursday and Sunday's 1257 are consistent.
 * - Left out: Kinshasa-Luanda 0021/0022 (Thursday, Sunday): international, outside the site's scope.
 */
import type { Weekday } from "../../lib/generated/prisma/client";
import type { Timetable } from "../../lib/timetable";

const rows: [Weekday, string, string, string, string, string][] = [
  ["MON", "1633", "FBM", "KWZ", "08:00", "08:45"],
  ["MON", "1633", "KWZ", "FIH", "09:30", "10:30"],
  ["MON", "1641", "FIH", "FKI", "11:15", "14:15"],
  ["MON", "1642", "FKI", "FIH", "15:00", "16:00"],
  ["MON", "1634", "FIH", "KWZ", "08:00", "11:00"],
  ["MON", "1634", "KWZ", "FBM", "11:45", "12:30"],
  ["MON", "1672", "FBM", "FIH", "13:15", "14:45"],
  ["MON", "1671", "FIH", "FBM", "15:30", "19:00"],
  ["MON", "1414", "FIH", "MJM", "09:00", "11:40"],
  ["MON", "1414", "MJM", "FBM", "12:25", "13:45"],
  ["MON", "1413", "FBM", "MJM", "14:30", "15:50"],
  ["MON", "1413", "MJM", "FIH", "16:35", "17:15"],

  ["TUE", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["TUE", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["TUE", "1433", "FIH", "MJM", "09:00", "11:40"],
  ["TUE", "1433", "MJM", "KWZ", "12:25", "13:40"],
  ["TUE", "1433", "KWZ", "FBM", "14:25", "15:10"],
  ["TUE", "1161", "FIH", "MDK", "08:00", "09:15"],
  ["TUE", "1162", "MDK", "FIH", "10:00", "11:15"],
  ["TUE", "1641", "FIH", "FKI", "12:00", "15:00"],
  ["TUE", "1642", "FKI", "FIH", "15:45", "16:45"],
  ["TUE", "1434", "FBM", "KWZ", "08:00", "08:45"],
  ["TUE", "1434", "KWZ", "MJM", "09:30", "10:45"],
  ["TUE", "1434", "MJM", "FIH", "11:30", "12:10"],

  ["WED", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["WED", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["WED", "1634", "FIH", "KWZ", "08:00", "11:00"],
  ["WED", "1634", "KWZ", "FBM", "11:45", "12:30"],
  ["WED", "1633", "FBM", "KWZ", "13:15", "14:00"],
  ["WED", "1633", "KWZ", "FIH", "14:45", "15:45"],
  ["WED", "1424", "FIH", "KGA", "16:30", "18:55"],
  ["WED", "1423", "KGA", "FIH", "19:40", "20:05"],
  ["WED", "1257", "FIH", "KND", "09:00", "11:00"],
  ["WED", "1647", "KND", "FMI", "11:45", "13:15"],
  ["WED", "1638", "FMI", "FBM", "14:00", "15:30"],

  ["THU", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["THU", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["THU", "1633", "FBM", "KWZ", "08:00", "08:45"],
  ["THU", "1633", "KWZ", "FIH", "09:30", "10:30"],
  ["THU", "1433", "FIH", "MJM", "11:15", "13:55"],
  ["THU", "1433", "MJM", "KWZ", "14:40", "15:55"],
  ["THU", "1433", "KWZ", "FBM", "16:45", "17:30"],
  ["THU", "1257", "FIH", "KND", "09:30", "12:30"],
  ["THU", "1647", "KND", "FMI", "13:15", "14:45"],
  ["THU", "1638", "FMI", "FBM", "15:30", "17:00"],
  ["THU", "1631", "FBM", "FMI", "08:00", "09:30"],
  ["THU", "1648", "FMI", "KND", "10:15", "11:45"],
  ["THU", "1258", "KND", "FIH", "12:30", "13:30"],
  ["THU", "1161", "FIH", "MDK", "14:15", "15:30"],
  ["THU", "1162", "MDK", "FIH", "16:15", "17:30"],

  ["FRI", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["FRI", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["FRI", "1434", "FBM", "KWZ", "08:00", "08:45"],
  ["FRI", "1434", "KWZ", "MJM", "09:30", "10:45"],
  ["FRI", "1434", "MJM", "FIH", "11:30", "12:10"],
  ["FRI", "1634", "FIH", "KWZ", "13:00", "16:00"],
  ["FRI", "1634", "KWZ", "FBM", "16:45", "17:30"],
  ["FRI", "1255", "FIH", "KND", "08:00", "11:00"],
  ["FRI", "1255", "KND", "FKI", "11:45", "12:45"],
  ["FRI", "1255", "FKI", "FIH", "13:30", "14:30"],

  ["SAT", "1612", "FBM", "FIH", "10:00", "11:30"],
  ["SAT", "1611", "FIH", "FBM", "13:45", "17:15"],
  ["SAT", "1161", "FIH", "MDK", "08:00", "09:15"],
  ["SAT", "1162", "MDK", "FIH", "10:00", "11:15"],
  ["SAT", "1641", "FIH", "FKI", "12:00", "15:00"],
  ["SAT", "1642", "FKI", "FIH", "15:45", "16:45"],
  ["SAT", "1414", "FBM", "MJM", "08:00", "09:20"],
  ["SAT", "1414", "MJM", "FIH", "10:05", "10:45"],
  ["SAT", "1413", "FIH", "MJM", "11:30", "14:10"],
  ["SAT", "1413", "MJM", "FBM", "15:00", "16:20"],
  ["SAT", "1672", "FBM", "FIH", "17:15", "18:45"],

  ["SUN", "1612", "FBM", "FIH", "08:00", "09:30"],
  ["SUN", "1611", "FIH", "FBM", "10:55", "14:25"],
  ["SUN", "1614", "FBM", "FIH", "15:45", "17:15"],
  ["SUN", "1613", "FIH", "FBM", "18:30", "22:00"],
  ["SUN", "1256", "FIH", "FKI", "08:00", "11:00"],
  ["SUN", "1256", "FKI", "KND", "11:45", "12:45"],
  ["SUN", "1256", "KND", "FIH", "13:30", "14:30"],
  ["SUN", "1424", "FIH", "KGA", "15:15", "17:40"],
  ["SUN", "1423", "KGA", "FIH", "18:25", "18:50"],
  ["SUN", "1257", "FIH", "KND", "10:00", "13:00"],
  ["SUN", "1647", "KND", "FMI", "13:45", "15:15"],
  ["SUN", "1638", "FMI", "FBM", "16:00", "17:30"],
  ["SUN", "1631", "FBM", "FMI", "10:15", "11:45"],
  ["SUN", "1648", "FMI", "KND", "12:30", "14:00"],
  ["SUN", "1258", "KND", "FIH", "14:45", "15:45"],
];

const A330 = new Set(["1611", "1612", "1613", "1614"]);

export const caa20261116: Timetable = {
  airline: "BU",
  label: "CAA du 16 nov. 2026",
  sourceUrl: "https://www.caacongo.com/horaires_16_11_26.pdf",
  validFrom: "2026-11-16",
  readOn: "2026-11-19",
  legs: rows.map(([day, n, from, to, dep, arr]) => ({
    days: [day], flight: `BU${n}`, from, to, dep, arr, aircraft: A330.has(n) ? "Airbus A330" : "Airbus A320",
  })),
};
