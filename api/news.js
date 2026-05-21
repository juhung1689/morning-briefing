export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const key = process.env.NEWS_KEY;

  try {
    const queries = [
      { q: 'economy OR finance OR stock market', category: '경제' },
      { q: 'geopolitics OR war OR diplomacy OR sanctions', category: '지정학' },
      { q: 'AI OR technology OR semiconductor', category: '기술' },
      { q: 'real estate OR housing OR property market', category: '부동산' }
    ];

    const results = await Promise.all(queries.map(async ({ q, category }) => {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=1&apiKey=${key}`;
      const r = await fetch(url);
      const d = await r.json();
      const article = d.articles?.[0];
      if (!article) return null;
      return {
        category,
        title: article.title?.replace(/\s*-\s*[^-]+$/, '') || '',
        summary: article.description || article.content?.slice(0, 150) || ''
      };
    }));

    const news = results.filter(Boolean);
    res.status(200).json(news);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
