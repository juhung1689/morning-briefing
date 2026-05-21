export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.NEWS_KEY;

  // 카테고리별 키워드 — 중요 브레이킹뉴스 위주
  const categories = [
    { label: '정치/외교', q: 'Trump OR Biden OR Putin OR Xi Jinping OR NATO OR sanctions OR nuclear deal OR summit' },
    { label: '경제/시장', q: 'Fed OR "interest rate" OR inflation OR recession OR tariff OR "stock market crash" OR IMF' },
    { label: '기술/AI',   q: 'AI OR semiconductor OR OpenAI OR Nvidia OR Apple OR "chip ban"' },
    { label: '한국/아시아', q: 'Korea OR Samsung OR "North Korea" OR Japan OR China trade' },
  ];

  try {
    // 각 카테고리에서 최신 + 인기 기사 1개씩 가져오기
    const results = await Promise.all(categories.map(async ({ label, q }) => {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=popularity&pageSize=3&apiKey=${key}`;
      const r = await fetch(url);
      const d = await r.json();

      // 최신성 + 인기 조합: publishedAt 기준으로 24시간 이내 기사 우선
      const now = Date.now();
      const articles = (d.articles || []).filter(a =>
        a.title && !a.title.includes('[Removed]') && a.description
      );

      // 24시간 이내 기사 우선, 없으면 첫번째
      const fresh = articles.find(a => (now - new Date(a.publishedAt).getTime()) < 86400000);
      const article = fresh || articles[0];

      if (!article) return null;

      return {
        category: label,
        title: article.title.replace(/\s*[-|]\s*\S+\s*$/, '').trim(),
        summary: article.description?.slice(0, 120) || '',
        publishedAt: article.publishedAt
      };
    }));

    const news = results.filter(Boolean);

    // 최신순으로 정렬
    news.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.status(200).json(news);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
