-- F1 Database Schema (Ergast dataset structure)

CREATE TABLE IF NOT EXISTS seasons (
  year        INTEGER PRIMARY KEY,
  url         VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS circuits (
  circuit_id   SERIAL PRIMARY KEY,
  circuit_ref  VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  location     VARCHAR(255),
  country      VARCHAR(255),
  lat          FLOAT,
  lng          FLOAT,
  alt          INTEGER,
  url          VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS constructors (
  constructor_id   SERIAL PRIMARY KEY,
  constructor_ref  VARCHAR(255) NOT NULL,
  name             VARCHAR(255) NOT NULL,
  nationality      VARCHAR(255),
  url              VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS drivers (
  driver_id    SERIAL PRIMARY KEY,
  driver_ref   VARCHAR(255) NOT NULL,
  number       INTEGER,
  code         VARCHAR(3),
  forename     VARCHAR(255) NOT NULL,
  surname      VARCHAR(255) NOT NULL,
  dob          DATE,
  nationality  VARCHAR(255),
  url          VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS status (
  status_id  SERIAL PRIMARY KEY,
  status     VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS races (
  race_id       SERIAL PRIMARY KEY,
  year          INTEGER NOT NULL REFERENCES seasons(year),
  round         INTEGER NOT NULL,
  circuit_id    INTEGER NOT NULL REFERENCES circuits(circuit_id),
  name          VARCHAR(255) NOT NULL,
  date          DATE,
  time          TIME,
  url           VARCHAR(255),
  fp1_date      DATE,
  fp1_time      TIME,
  fp2_date      DATE,
  fp2_time      TIME,
  fp3_date      DATE,
  fp3_time      TIME,
  quali_date    DATE,
  quali_time    TIME,
  sprint_date   DATE,
  sprint_time   TIME
);

CREATE TABLE IF NOT EXISTS results (
  result_id          SERIAL PRIMARY KEY,
  race_id            INTEGER NOT NULL REFERENCES races(race_id),
  driver_id          INTEGER NOT NULL REFERENCES drivers(driver_id),
  constructor_id     INTEGER NOT NULL REFERENCES constructors(constructor_id),
  number             INTEGER,
  grid               INTEGER,
  position           INTEGER,
  position_text      VARCHAR(255),
  position_order     INTEGER NOT NULL,
  points             FLOAT NOT NULL,
  laps               INTEGER NOT NULL,
  time               VARCHAR(255),
  milliseconds       INTEGER,
  fastest_lap        INTEGER,
  rank               INTEGER,
  fastest_lap_time   VARCHAR(255),
  fastest_lap_speed  VARCHAR(255),
  status_id          INTEGER REFERENCES status(status_id)
);

CREATE TABLE IF NOT EXISTS driver_standings (
  driver_standings_id  SERIAL PRIMARY KEY,
  race_id              INTEGER NOT NULL REFERENCES races(race_id),
  driver_id            INTEGER NOT NULL REFERENCES drivers(driver_id),
  points               FLOAT NOT NULL,
  position             INTEGER,
  position_text        VARCHAR(255),
  wins                 INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS constructor_standings (
  constructor_standings_id  SERIAL PRIMARY KEY,
  race_id                   INTEGER NOT NULL REFERENCES races(race_id),
  constructor_id            INTEGER NOT NULL REFERENCES constructors(constructor_id),
  points                    FLOAT NOT NULL,
  position                  INTEGER,
  position_text             VARCHAR(255),
  wins                      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS constructor_results (
  constructor_results_id  SERIAL PRIMARY KEY,
  race_id                 INTEGER NOT NULL REFERENCES races(race_id),
  constructor_id          INTEGER NOT NULL REFERENCES constructors(constructor_id),
  points                  FLOAT,
  status                  VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS qualifying (
  qualify_id      SERIAL PRIMARY KEY,
  race_id         INTEGER NOT NULL REFERENCES races(race_id),
  driver_id       INTEGER NOT NULL REFERENCES drivers(driver_id),
  constructor_id  INTEGER NOT NULL REFERENCES constructors(constructor_id),
  number          INTEGER NOT NULL,
  position        INTEGER,
  q1              VARCHAR(255),
  q2              VARCHAR(255),
  q3              VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS lap_times (
  race_id       INTEGER NOT NULL REFERENCES races(race_id),
  driver_id     INTEGER NOT NULL REFERENCES drivers(driver_id),
  lap           INTEGER NOT NULL,
  position      INTEGER,
  time          VARCHAR(255),
  milliseconds  INTEGER,
  PRIMARY KEY (race_id, driver_id, lap)
);

CREATE TABLE IF NOT EXISTS pit_stops (
  race_id       INTEGER NOT NULL REFERENCES races(race_id),
  driver_id     INTEGER NOT NULL REFERENCES drivers(driver_id),
  stop          INTEGER NOT NULL,
  lap           INTEGER NOT NULL,
  time          TIME,
  duration      VARCHAR(255),
  milliseconds  INTEGER,
  PRIMARY KEY (race_id, driver_id, stop)
);

CREATE TABLE IF NOT EXISTS sprint_results (
  sprint_result_id   SERIAL PRIMARY KEY,
  race_id            INTEGER NOT NULL REFERENCES races(race_id),
  driver_id          INTEGER NOT NULL REFERENCES drivers(driver_id),
  constructor_id     INTEGER NOT NULL REFERENCES constructors(constructor_id),
  number             INTEGER,
  grid               INTEGER,
  position           INTEGER,
  position_text      VARCHAR(255),
  position_order     INTEGER NOT NULL,
  points             FLOAT NOT NULL,
  laps               INTEGER NOT NULL,
  time               VARCHAR(255),
  milliseconds       INTEGER,
  fastest_lap        INTEGER,
  fastest_lap_time   VARCHAR(255),
  status_id          INTEGER REFERENCES status(status_id)
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_results_driver    ON results(driver_id);
CREATE INDEX IF NOT EXISTS idx_results_race      ON results(race_id);
CREATE INDEX IF NOT EXISTS idx_results_constructor ON results(constructor_id);
CREATE INDEX IF NOT EXISTS idx_races_year        ON races(year);
CREATE INDEX IF NOT EXISTS idx_driver_standings_driver ON driver_standings(driver_id);
CREATE INDEX IF NOT EXISTS idx_constructor_standings_constructor ON constructor_standings(constructor_id);
