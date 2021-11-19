const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, "covid19India.db");
let db = null;

//Middleware
app.use(express.json());

//starting server and connecting to database
const serverAndDb = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    app.listen(PORT, () => {
      console.log(`Server started at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
};

serverAndDb();

const makeState = (state) => {
  return {
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  };
};

const makeDistrict = (district) => {
  return {
    districtId: district.district_id,
    districtName: district.district_name,
    stateId: district.state_id,
    cases: district.cases,
    cured: district.cured,
    active: district.active,
    deaths: district.deaths,
  };
};

//Get all states
app.get("/states/", async (req, res) => {
  const query = `
        SELECT *
        FROM state
    ;`;

  const states = await db.all(query);
  res.send(states.map((state) => makeState(state)));
});

//Get a state with id
app.get("/states/:stateId/", async (req, res) => {
  const { stateId } = req.params;
  const query = `
        SELECT *
        FROM state
        WHERE state_id=${stateId}
    ;`;

  const state = await db.get(query);
  res.send(makeState(state));
});

//Creating a district
app.post("/districts/", async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const query = `
        INSERT INTO 
            district (district_name, state_id, cases, cured, active, deaths)
        VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths})
    ;`;

  const district = await db.run(query);
  res.send("District Successfully Added");
});

//Get a district
app.get("/districts/:districtId/", async (req, res) => {
  const { districtId } = req.params;
  const query = `
        SELECT *
        FROM district
        WHERE district_id = ${districtId}
    ;`;

  const district = await db.get(query);
  res.send(makeDistrict(district));
});

// Delete a district
app.delete("/districts/:districtId", async (req, res) => {
  const { districtId } = req.params;
  const query = `
        DELETE FROM district
        WHERE district_id = ${districtId}
    ;`;

  const district = await db.run(query);
  res.send("District Removed");
});

// Update a State
app.put("/districts/:districtId", async (req, res) => {
  const { districtId } = req.params;
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const query = `
        UPDATE district
        SET 
            district_name = '${districtName}',
            state_id = ${stateId},
            cases = ${cases},
            cured = ${cured},
            active = ${active},
            deaths = ${deaths}
        WHERE
            district_id = ${districtId}
    ;`;

  const district = await db.run(query);
  res.send("District Details Updated");
});

//Getting the Statistics of a state
app.get("/states/:stateId/stats/", async (req, res) => {
  const { stateId } = req.params;
  const query = `
        SELECT cases, cured, active, deaths
        FROM district
        WHERE state_id=${stateId}
    ;`;

  const districts = await db.all(query);

  const start = districts.reduce((acc, curr) => {
    acc.cases += curr.cases;
    acc.cured += curr.cured;
    acc.active += curr.active;
    acc.deaths += curr.deaths;
    return acc;
  });

  const stats = {
    totalCases: start.cases,
    totalCured: start.cured,
    totalActive: start.active,
    totalDeaths: start.deaths,
  };
  res.send(stats);
});

// Get District Details
app.get("/districts/:districtId/details/", async (req, res) => {
  const { districtId } = req.params;
  const query1 = `
        SELECT state_id
        FROM district
        WHERE district_id = ${districtId}
    ;`;

  const { state_id } = await db.get(query1);

  const query2 = `
      SELECT state_name
      FROM state
      WHERE state_id = ${state_id}
  ;`;

  const state = await db.get(query2);
  res.send({ stateName: state.state_name });
});

module.exports = app;
