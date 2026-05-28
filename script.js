const apiKey = "072bced35f76279ec14583914c939f07";

const form = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const locationButton = document.getElementById("locationButton");
const quickCities = document.querySelectorAll("[data-city]");
const hourlyForecast = document.getElementById("hourlyForecast");
const dailyForecast = document.getElementById("dailyForecast");
const localLocationLabel = "Kuber Side, Agra";

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

function weatherIcon(condition, isNight = false) {
  if (condition === "Clear" && isNight) {
    return "&#9790;";
  }

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
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
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
      isNight: data.current.is_day === 0,
      ...openMeteoCondition(data.current.weather_code),
    },
    hourly: data.hourly,
    daily: data.daily,
  };
}

function isNightHour(isoTime) {
  const hour = Number(isoTime.slice(11, 13));
  return hour < 6 || hour >= 18;
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

function renderHourlyForecast(bundle, currentWeather) {
  const currentIndex = Math.max(0, bundle.hourly.time.findIndex((time) => time >= bundle.current.time));
  const hours = bundle.hourly.time.slice(currentIndex, currentIndex + 8);

  hourlyForecast.innerHTML = hours.map((time, index) => {
    const sourceIndex = currentIndex + index;
    const weather = index === 0 ? currentWeather : openMeteoCondition(bundle.hourly.weather_code[sourceIndex]);
    const label = index === 0 ? "Now" : formatModelHour(time);
    const night = isNightHour(time);
    const temp = index === 0 ? currentWeather.temp : bundle.hourly.temperature_2m[sourceIndex];

    return `
      <article class="hour-card">
        <span>${label}</span>
        <div class="weather-icon">${weatherIcon(weather.condition, night)}</div>
        <b>${temp.toFixed(1)}&deg;</b>
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
  return {
    temp: current.main.temp,
    condition: current.weather[0].main,
    description: current.weather[0].description,
    humidity: current.main.humidity,
    windKmh: Math.round(current.wind.speed * 3.6),
    isNight: liveBundle ? liveBundle.current.isNight : current.dt < current.sys.sunrise || current.dt > current.sys.sunset,
  };
}

async function renderWeatherData(data, displayName) {
  try {
    const [airQuality, liveBundle] = await Promise.all([
      getAirQuality(data.coord.lat, data.coord.lon),
      getLiveWeatherBundle(data.coord.lat, data.coord.lon).catch(() => null),
    ]);
    const displayWeather = getDisplayWeather(data, liveBundle);
    const condition = displayWeather.condition;
    const description = displayWeather.description;
    const isNight = displayWeather.isNight;

    document.getElementById("cityName").innerText = displayName || data.name;
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
    cityInput.value = displayName || data.name || cityInput.value;

    document.getElementById("airIndex").innerText = `US AQI ${airQuality.usAqi}`;
    document.getElementById("airLabel").innerText = airQualityLabel(airQuality.usAqi);
    document.getElementById("pm25").innerText = `PM2.5 ${airQuality.pm25.toFixed(1)}`;
    document.getElementById("pm10").innerText = `PM10 ${airQuality.pm10.toFixed(1)}`;
    if (liveBundle) {
      renderHourlyForecast(liveBundle, displayWeather);
      renderDailyForecast(liveBundle);
    }
  } catch (error) {
    alert(error.message || "City not found");
  }
}

async function getWeather(defaultCity) {
  const city = (defaultCity || cityInput.value).trim();

  if (!city) return;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "City not found");
    return;
  }

  renderWeatherData(data);
}

async function getWeatherByLocation(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
  const res = await fetch(url);
  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Location weather unavailable");
    return;
  }

  renderWeatherData(data, localLocationLabel);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  getWeather();
});

locationButton.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Location is not supported in this browser.");
    return;
  }

  locationButton.innerText = "Finding location...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locationButton.innerText = "Use my location";
      getWeatherByLocation(position.coords.latitude, position.coords.longitude);
    },
    () => {
      locationButton.innerText = "Use my location";
      alert("Location permission was not allowed.");
    },
    { enableHighAccuracy: true, timeout: 12000 }
  );
});

quickCities.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.closest(".weather-strip")) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    getWeather(button.dataset.city);
  });
});
