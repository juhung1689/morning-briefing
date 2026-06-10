export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.OPENWEATHER_KEY;
  const lat = 37.5665;
  const lon = 126.9780;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=kr`;
    const r = await fetch(url);
    const d = await r.json();

    const weather = {
      temp: Math.round(d.main.temp),
      feels: Math.round(d.main.feels_like),
      humidity: d.main.humidity,
      wind: Math.round(d.wind.speed),
      desc: d.weather[0].description,
      isRain: ['Rain', 'Drizzle', 'Thunderstorm'].includes(d.weather[0].main),
      rain: d.rain ? d.rain['1h'] || 0 : 0,
    };

    res.json(weather);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
