export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbols = {
    '^GSPC': 'S&P 500',
    '^IXIC': '나스닥',
    '^DJI': '다우존스',
    'AAPL': '애플',
    'NVDA': '엔비디아',
    'TSLA': '테슬라',
  };

  const results = [];

  for (const [symbol, name] of Object.entries(symbols)) {
    try {
      const encoded = encodeURIComponent(symbol);
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=2d`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await r.json();
      const meta = data?.chart?.result?.[0]?.meta;
      if (!meta) throw new Error('no meta');

      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      const change = ((price - prev) / prev * 100).toFixed(2);
      const isIndex = symbol.startsWith('^');

      results.push({
        symbol,
        name,
        price: isIndex ? price.toFixed(2) : price.toFixed(2),
        change: parseFloat(change),
        isIndex,
      });
    } catch (e) {
      results.push({ symbol, name, price: null, change: null, isIndex: symbol.startsWith('^') });
    }
  }

  const indices = results.filter(r => r.isIndex);
  const stocks = results.filter(r => !r.isIndex);

  res.json({ indices, stocks });
}
