export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.NEWS_KEY;
  if (!key) return res.status(500).json({ error: 'NEWS_KEY not set' });

  const categories = [
    { label: '정치/외교', q: 'Trump OR Iran OR NATO OR nuclear OR diplomacy OR sanctions' },
    { label: '경제/시장', q: 'Fed OR inflation OR "interest rate" OR recession OR tariff OR IMF' },
    { label: '기술/AI',   q: 'AI OR Nvidia OR semiconductor OR OpenAI OR Apple OR chip' },
    { label: '한국/아시아', q: 'Korea OR Samsung OR "North Korea" OR Japan OR China' },
  ];

  try {
    const seenTitles = new Set();

    const results = await Promise.all(categories.map(async ({ label, q }) => {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${key}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.status !== 'ok') throw new Error(d.message || 'NewsAPI error');

      const articles = (d.articles || []).filter(a =>
        a.title && !a.title.includes('[Removed]') && a.description
      );

      // 중복 제거: 같은 제목 스킵
      const article = articles.find(a => {
        const key = a.title.slice(0, 40).toLowerCase();
        if (seenTitles.has(key)) return false;
        seenTitles.add(key);
        return true;
      });

      if (!article) return null;
      return {
        category: label,
        title: article.title.replace(/\s*[-|]\s*[^-|]+$/, '').trim(),
        summary: (article.description || '').slice(0, 150),
        publishedAt: article.publishedAt
      };
    }));

    const news = results.filter(Boolean);
    news.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    res.status(200).json(news);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
