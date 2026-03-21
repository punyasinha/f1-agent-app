import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";

const client = AIProjectClient.fromEndpoint(
  "https://f1-dataagent-resource.services.ai.azure.com/api/projects/f1-dataagent",
  new DefaultAzureCredential()
);

const agent = await client.agents.createAgent("gpt-4o-mini", {
  name: "f1-data-agent",
  instructions: `You are a Formula 1 data assistant with access to a PostgreSQL database containing F1 World Championship data from 1950 to 2024.

Tables available:
- circuits (circuit_id, name, location, country, lat, lng)
- races (race_id, year, round, circuit_id, name, date)
- drivers (driver_id, forename, surname, nationality, dob)
- constructors (constructor_id, name, nationality)
- results (result_id, race_id, driver_id, constructor_id, position, points, laps, fastest_lap_time, status_id)
- status (status_id, status) e.g. Finished, DNF
- driver_standings, constructor_standings, qualifying, pit_stops, lap_times, sprint_results

Always: 1) use list_tables to confirm column names, 2) join tables as needed, 3) return concise natural language answers.`,
});

console.log(`Agent created!`);
console.log(`Name: ${agent.name}`);
console.log(`ID:   ${agent.id}`);
console.log(`\nAdd this to your .env.local:`);
console.log(`AZURE_AGENT_ID="${agent.id}"`);
