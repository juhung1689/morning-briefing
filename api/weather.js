export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const lat = req.query.lat || '37.5665';
  const lon = req.query.lon || '126.9780';
  const key = process.env.OPENWEATHER_KEY;

  try {
    const r = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric&lang=kr&cnt=8`
    );
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
