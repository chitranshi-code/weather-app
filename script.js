const apiKey = "072bced35f76279ec14583914c939f07";

const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const quickCities = document.querySelectorAll("[data-city]");
const hourlyForecast = document.getElementById("hourlyForecast");
const dailyForecast = document.getElementById("dailyForecast");

const weatherCopy = {
  Clear: "Clear skies over the city with bright, open air and easy visibility.",
  Clouds: "Clouds are moving across the skyline, keeping the day soft and muted.",
  Rain: "Rain is active right now, so the view shifts into a cooler wet-weather mood.",
  Drizzle: "Light drizzle is in the area with a calm, misty feel.",
  Thunderstorm: "Storm clouds are overhead, bringing a dramatic darker forecast.",
  Snow: "Snow conditions are reported, giving the city a cold white-weather setting.",
  Mist: "Low mist is hanging around the city and softening the horizon.",
  Haze: "Haze is present in the city, so the background becomes warmer and diffused.",
  Fog: "Fog is reducing visibility and giving the forecast a muted atmosphere.",
};

function airQualityLabel(aqi) {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive Groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function weatherClass(condition = "Clear") {
  return `weather-${condition.toLowerCase()}`;
}

function setWeatherTheme(condition, isNight) {
  document.body.className = `${weatherClass(condition)} ${isNight ? "is-night" : "is-day"}`;
}

function formatSpeed(metersPerSecond) {
  return `${Math.round(metersPerSecond * 3.6)} km/h`;
}

function weatherIcon(condition) {
  const icons = {
    Clear: "&#9728;",
    Clouds: "&#9729;",
    Rain: "&#9730;",
    Drizzle: "&#9730;",
    Thunderstorm: "&#9889;",
    Snow: "&#10052;",
    Mist: "&#8779;",
    Haze: "&#8779;",
    Fog: "&#8779;",
  };

  return icons[condition] || "&#9729;";
}

function openMeteoCondition(code) {
  if (code === 0) {
    return { condition: "Clear", description: "clear sky" };
  }

  if ([1, 2].includes(code)) {
    return { condition: "Clear", description: "partly sunny" };
  }

  if (code === 3) {
    return { condition: "Clouds", description: "cloudy" };
  }

  if ([45, 48].includes(code)) {
    return { condition: "Fog", description: "foggy" };
  }

  if ([51, 53, 55, 56, 57].includes(code)) {
    return { condition: "Drizzle", description: "drizzle" };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { condition: "Rain", description: "rain" };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { condition: "Snow", description: "snow" };
  }

  if ([95, 96, 99].includes(code)) {
    return { condition: "Thunderstorm", description: "thunderstorm" };
  }

  return { condition: "Clouds", description: "mixed weather" };
}

function cityDate(timestamp, timezoneOffset) {
  return new Date((timestamp + timezoneOffset) * 1000);
}

function formatCityTime(timestamp, timezoneOffset, options) {
  return cityDate(timestamp, timezoneOffset).toLocaleString("en-US", {
    timeZone: "UTC",
    ...options,
  });
}

async function getAirQuality(lat, lon) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5&timezone=auto`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.current) {
    throw new Error(data.message || "Air quality unavailable");
  }

  return {
    usAqi: data.current.us_aqi,
    pm25: data.current.pm2_5,
    pm10: data.current.pm10,
  };
}

async function getLiveWeatherBundle(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok || !data.current) {
    throw new Error("Live model weather unavailable");
  }

  return {
    current: {
      temp: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      windKmh: data.current.wind_speed_10m,
      time: data.current.time,
      ...openMeteoCondition(data.current.weather_code),
    },
    hourly: data.hourly,
    daily: data.daily,
  };
}

function formatModelHour(isoTime) {
  const hour = Number(isoTime.slice(11, 13));
  const displayHour = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";

  return `${displayHour} ${suffix}`;
}

function formatModelDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

function renderHourlyForecast(bundle) {
  const currentIndex = Math.max(0, bundle.hourly.time.findIndex((time) => time >= bundle.current.time));
  const hours = bundle.hourly.time.slice(currentIndex, currentIndex + 8);

  hourlyForecast.innerHTML = hours.map((time, index) => {
    const sourceIndex = currentIndex + index;
    const weather = openMeteoCondition(bundle.hourly.weather_code[sourceIndex]);
    const label = index === 0 ? "Now" : formatModelHour(time);

    return `
      <article class="hour-card">
        <span>${label}</span>
        <div class="weather-icon">${weatherIcon(weather.condition)}</div>
        <b>${bundle.hourly.temperature_2m[sourceIndex].toFixed(1)}&deg;</b>
        <span>${bundle.hourly.precipitation_probability[sourceIndex]}% rain</span>
      </article>
    `;
  }).join("");
}

function renderDailyForecast(bundle) {
  dailyForecast.innerHTML = bundle.daily.time.map((date, index) => {
    const weather = openMeteoCondition(bundle.daily.weather_code[index]);
    const high = bundle.daily.temperature_2m_max[index];
    const low = bundle.daily.temperature_2m_min[index];

    return `
      <article class="day-card">
        <span>${formatModelDay(date)}</span>
        <div class="weather-icon">${weatherIcon(weather.condition)}</div>
        <b>${high.toFixed(0)}&deg; / ${low.toFixed(0)}&deg;</b>
        <p>${weather.description}</p>
      </article>
    `;
  }).join("");
}

function getDisplayWeather(current, liveBundle) {
  if (liveBundle) {
    return liveBundle.current;
  }

  return {
    temp: current.main.temp,
    condition: current.weather[0].main,
    description: current.weather[0].description,
    humidity: current.main.humidity,
    windKmh: Math.round(current.wind.speed * 3.6),
  };
}

async function getWeather(defaultCity) {
  const city = (defaultCity || cityInput.value).trim();

  if (!city) return;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "City not found");
    }

    const [airQuality, liveBundle] = await Promise.all([
      getAirQuality(data.coord.lat, data.coord.lon),
      getLiveWeatherBundle(data.coord.lat, data.coord.lon).catch(() => null),
    ]);
    const displayWeather = getDisplayWeather(data, liveBundle);
    const condition = displayWeather.condition;
    const description = displayWeather.description;
    const isNight = data.dt < data.sys.sunrise || data.dt > data.sys.sunset;

    document.getElementById("cityName").innerText = data.name;
    document.getElementById("temp").innerHTML = `${displayWeather.temp.toFixed(1)}&deg;C`;
    document.getElementById("condition").innerText = condition;
    document.getElementById("description").innerText = weatherCopy[condition] || description;
    document.getElementById("humidity").innerText = `Humidity ${displayWeather.humidity}%`;
    document.getElementById("wind").innerText = `Wind ${Math.round(displayWeather.windKmh)} km/h`;
    document.getElementById("localTime").innerText = formatCityTime(data.dt, data.timezone, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    setWeatherTheme(condition, isNight);
    cityInput.value = data.name;

    document.getElementById("airIndex").innerText = `US AQI ${airQuality.usAqi}`;
    document.getElementById("airLabel").innerText = airQualityLabel(airQuality.usAqi);
    document.getElementById("pm25").innerText = `PM2.5 ${airQuality.pm25.toFixed(1)}`;
    document.getElementById("pm10").innerText = `PM10 ${airQuality.pm10.toFixed(1)}`;
    if (liveBundle) {
      renderHourlyForecast(liveBundle);
      renderDailyForecast(liveBundle);
    }
  } catch (error) {
    alert(error.message || "City not found");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  getWeather();
});

quickCities.forEach((button) => {
  button.addEventListener("click", () => getWeather(button.dataset.city));
});
