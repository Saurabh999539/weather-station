
const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const message = document.getElementById("message");
const weatherSection = document.getElementById("weather-section");
const historyList = document.getElementById("history-list");

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Rain showers",
    81: "Moderate rain showers",
    82: "Heavy rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Severe thunderstorm"
  };

  return descriptions[code] || "Weather conditions";
}

function getValue(object, keys, fallback = undefined) {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) {
      return object[key];
    }
  }
  return fallback;
}

function renderForecast(daily) {
  const forecast = document.getElementById("forecast");
  forecast.replaceChildren();

  const dates = daily?.time || daily?.dates || [];
  const highs = daily?.temperature_2m_max || daily?.maxTemperature || [];
  const lows = daily?.temperature_2m_min || daily?.minTemperature || [];
  const codes = daily?.weather_code || daily?.weathercode || [];

  dates.forEach((date, index) => {
    const day = document.createElement("div");
    day.className = "forecast-day";

    const dateObject = new Date(`${date}T12:00:00`);
    const dayName = index === 0
      ? "Today"
      : dateObject.toLocaleDateString("en-IN", { weekday: "short" });

    const code = Number(codes[index] ?? -1);

    const label = document.createElement("div");
    label.className = "day-name";
    label.textContent = dayName;

    const icon = document.createElement("div");
    icon.className = "day-icon";
    icon.textContent = getWeatherIcon(code);

    const high = document.createElement("strong");
    high.textContent = `${Math.round(Number(highs[index]))}°`;

    const low = document.createElement("div");
    low.className = "low";
    low.textContent = `${Math.round(Number(lows[index]))}° low`;

    day.append(label, icon, high, low);
    forecast.appendChild(day);
  });

  if (!dates.length) {
    forecast.textContent = "Forecast information is unavailable.";
  }
}

function renderWeather(data) {
  const current = data.current || data.weather || data;
  const daily = data.daily || data.forecast || {};
  const location = data.location || data.city || {};

  const city = typeof location === "string"
    ? location
    : getValue(location, ["name", "city", "title"], cityInput.value);

  const temperature = getValue(current, [
    "temperature_2m", "temperature", "temp"
  ]);

  const feelsLike = getValue(current, [
    "apparent_temperature", "feels_like", "feelsLike"
  ], temperature);

  const humidity = getValue(current, [
    "relative_humidity_2m", "humidity", "relativeHumidity"
  ]);

  const wind = getValue(current, [
    "wind_speed_10m", "windspeed_10m", "wind_speed", "windSpeed"
  ]);

  const code = Number(getValue(current, [
    "weather_code", "weathercode", "weatherCode"
  ], -1));

  document.getElementById("location-name").textContent = city;
  document.getElementById("weather-description").textContent =
    getWeatherDescription(code);
  document.getElementById("weather-icon").textContent = getWeatherIcon(code);

  document.getElementById("temperature").textContent =
    temperature == null ? "--" : Math.round(Number(temperature));

  document.getElementById("feels-like").textContent =
    feelsLike == null ? "--" : `${Math.round(Number(feelsLike))}°C`;

  document.getElementById("humidity").textContent =
    humidity == null ? "--" : `${Math.round(Number(humidity))}%`;

  document.getElementById("wind-speed").textContent =
    wind == null ? "--" : `${Math.round(Number(wind))} km/h`;

  renderForecast(daily);
  weatherSection.classList.remove("hidden");
}

weatherForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    showMessage("Please enter a city name.", true);
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching...";
  showMessage("Getting weather information...");

  try {
    const response = await fetch(
      `/api/weather?city=${encodeURIComponent(city)}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "Weather search failed.");
    }

    renderWeather(data);
    showMessage(`Weather loaded for ${city}.`);
    await loadHistory();
  } catch (error) {
    showMessage(
      `${error.message} Check that the backend is running and the API response is valid.`,
      true
    );
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "Search Weather";
  }
});

async function loadHistory() {
  historyList.replaceChildren();

  const loading = document.createElement("p");
  loading.className = "muted";
  loading.textContent = "Loading saved reports...";
  historyList.appendChild(loading);

  try {
    const response = await fetch("/api/reports");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load saved reports.");
    }

    const reports = Array.isArray(data)
      ? data
      : data.reports || data.history || [];

    historyList.replaceChildren();

    if (!reports.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent =
        "No saved reports yet. Search for a city to get started.";
      historyList.appendChild(empty);
      return;
    }

    reports.forEach((report) => {
      const item = document.createElement("div");
      item.className = "history-item";

      const details = document.createElement("div");
      const title = document.createElement("strong");
      const date = document.createElement("p");

      title.textContent = report.city || report.location?.name || "Weather report";

      const savedAt = report.createdAt || report.created_at || report.date;
      date.textContent = savedAt
        ? new Date(savedAt).toLocaleString()
        : "Saved weather report";

      details.append(title, date);

      const temp = document.createElement("div");
      temp.className = "history-temp";

      const value = report.temperature ??
        report.current?.temperature_2m ??
        report.weather?.temperature;

      temp.textContent = value == null ? "—" : `${Math.round(Number(value))}°C`;

      item.append(details, temp);
      historyList.appendChild(item);
    });
  } catch (error) {
    historyList.replaceChildren();
    const problem = document.createElement("p");
    problem.className = "muted";
    problem.textContent = `Could not load history: ${error.message}`;
    historyList.appendChild(problem);
  }
}

document.getElementById("refresh-history")
  .addEventListener("click", loadHistory);

async function checkServer() {
  const status = document.getElementById("server-status");

  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error("Server status unavailable");

    status.textContent = "Server connected";
  } catch {
    status.textContent = "Could not check server status";
  }
}

loadHistory();
checkServer();
