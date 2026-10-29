
require("dotenv").config();
const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
const client = new MongoClient(process.env.MONGODB_URI);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

let reports;

const conditions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  95: "Thunderstorm"
};

app.get("/api/status", async (req, res) => {
  try {
    await client.db("admin").command({ ping: 1 });
    res.json({ connected: true, message: "MongoDB connected" });
  } catch (error) {
    res.status(500).json({ connected: false, message: error.message });
  }
});

app.get("/api/weather", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();

    if (!city) {
      return res.status(400).json({ error: "Enter a city name." });
    }

    const geoResponse = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(city) + "&count=1&language=en&format=json"
    );

    if (!geoResponse.ok) throw new Error("Geocoding service unavailable");

    const geoData = await geoResponse.json();
    const place = geoData.results?.[0];

    if (!place) {
      return res.status(404).json({ error: "City not found." });
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}` +
      `&longitude=${place.longitude}` +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature," +
      "weather_code,wind_speed_10m&timezone=auto";

    const weatherResponse = await fetch(url);
    if (!weatherResponse.ok) throw new Error("Weather service unavailable");

    const data = await weatherResponse.json();
    const current = data.current;

    const report = {
      city: place.name,
      country: place.country || "",
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      feelsLike: current.apparent_temperature,
      windSpeed: current.wind_speed_10m,
      condition: conditions[current.weather_code] || "Unknown",
      observedAt: current.time,
      savedAt: new Date()
    };

    const saved = await reports.insertOne(report);

    res.json({ ...report, id: saved.insertedId });
  } catch (error) {
    console.error("Weather error:", error.message);
    res.status(502).json({
      error: "Weather request failed. Check the server terminal."
    });
  }
});

app.get("/api/reports", async (req, res) => {
  try {
    const city = String(req.query.city || "").trim();
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 50)
    );

    const filter = city
      ? { city: { $regex: city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {};

    const history = await reports.find(filter)
      .sort({ savedAt: -1 })
      .limit(limit)
      .toArray();

    res.json({ count: history.length, reports: history });
  } catch (error) {
    console.error("History error:", error.message);
    res.status(500).json({ error: "Could not load history." });
  }
});

async function start() {
  await client.connect();
  reports = client.db(process.env.DB_NAME || "weather_station")
    .collection("reports");

  await client.db("admin").command({ ping: 1 });
  console.log("MongoDB connected successfully!");

  app.listen(PORT, () => {
    console.log(`Weather Station running at http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
