#!/usr/bin/env bash
# Load Kaggle F1 CSV files into Neon
# Usage: DATABASE_URL="postgres://..." ./load-data.sh /path/to/kaggle/csvs
#
# Download dataset from: https://www.kaggle.com/datasets/rohanrao/formula-1-world-championship-1950-2020

set -euo pipefail

CSV_DIR="${1:-.}"
DB="${DATABASE_URL}"

if [[ -z "$DB" ]]; then
  echo "ERROR: Set DATABASE_URL environment variable first."
  echo "  export DATABASE_URL=\"postgresql://user:pass@host/dbname?sslmode=require\""
  exit 1
fi

echo "Loading F1 data from: $CSV_DIR"
echo "Target: $DB"

psql "$DB" -c "\COPY seasons           FROM '$CSV_DIR/seasons.csv'            CSV HEADER"
psql "$DB" -c "\COPY circuits          FROM '$CSV_DIR/circuits.csv'            CSV HEADER"
psql "$DB" -c "\COPY constructors      FROM '$CSV_DIR/constructors.csv'        CSV HEADER"
psql "$DB" -c "\COPY drivers           FROM '$CSV_DIR/drivers.csv'             CSV HEADER"
psql "$DB" -c "\COPY status            FROM '$CSV_DIR/status.csv'              CSV HEADER"
psql "$DB" -c "\COPY races             FROM '$CSV_DIR/races.csv'               CSV HEADER"
psql "$DB" -c "\COPY results           FROM '$CSV_DIR/results.csv'             CSV HEADER"
psql "$DB" -c "\COPY driver_standings  FROM '$CSV_DIR/driver_standings.csv'    CSV HEADER"
psql "$DB" -c "\COPY constructor_standings FROM '$CSV_DIR/constructor_standings.csv' CSV HEADER"
psql "$DB" -c "\COPY constructor_results   FROM '$CSV_DIR/constructor_results.csv'   CSV HEADER"
psql "$DB" -c "\COPY qualifying        FROM '$CSV_DIR/qualifying.csv'          CSV HEADER"
psql "$DB" -c "\COPY lap_times         FROM '$CSV_DIR/lap_times.csv'           CSV HEADER"
psql "$DB" -c "\COPY pit_stops         FROM '$CSV_DIR/pit_stops.csv'           CSV HEADER"
psql "$DB" -c "\COPY sprint_results    FROM '$CSV_DIR/sprint_results.csv'      CSV HEADER"

echo "Done! Run database/verify.sql to confirm row counts."
