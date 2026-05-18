export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const symbols = ['^GSPC', '^IXIC', '^DJI', 'AAPL', 'NVDA', 'TSLA'];
  const names = {
    '^GSPC': 'S&P 500', '^IXIC': '나스닥', '^DJI': '다우존스',
    'AAPL': '애플', 'NVDA': '엔비디아', 'TSLA': '테슬라'
  };

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbols.join(',')}&range=1d&interval=1d`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await r.json();

    const q2url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
    const r2 = await fetch(q2url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data2 = await r2.json();
    const quotes = data2.quoteResponse?.result || [];

    const result = quotes.map(q => {
      const change = q.regularMarketChangePercent || 0;
      const price = q.regularMarketPrice || 0;
      const isIndex = q.symbol.startsWith('^');
      return {
        name: names[q.symbol] || q.symbol,
        ticker: q.symbol.replace('^',''),
        price: isIndex ? price.toLocaleString('en-US', {maximumFractionDigits:0}) : `$${price.toFixed(2)}`,
        change: `${change>=0?'+':''}${change.toFixed(2)}%`,
        direction: change >= 0 ? 'up' : 'down'
      };
    });

    const indices = result.filter(s => ['^GSPC','^IXIC','^DJI'].includes(quotes.find(q=>names[q.symbol]===s.name)?.symbol));
    const stocks = result.filter(s => !['S&P 500','나스닥','다우존스'].includes(s.name));

    const spChange = quotes.find(q=>q.symbol==='^GSPC')?.regularMarketChangePercent || 0;
    const nasdaqChange = quotes.find(q=>q.symbol==='^IXIC')?.regularMarketChangePercent || 0;
    const summary = `어제 미국 증시는 S&P500이 ${spChange>=0?'상승':'하락'}(${spChange>=0?'+':''}${spChange.toFixed(2)}%), 나스닥이 ${nasdaqChange>=0?'상승':'하락'}(${nasdaqChange>=0?'+':''}${nasdaqChange.toFixed(2)}%)으로 마감했습니다. ${spChange > 0 && nasdaqChange > 0 ? '전반적으로 강세 흐름을 보였습니다.' : spChange < 0 && nasdaqChange < 0 ? '전반적으로 약세 흐름을 보였습니다.' : '혼조세로 마감했습니다.'}`;

    res.status(200).json({ indices: result.slice(0,3), stocks: result.slice(3), summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
