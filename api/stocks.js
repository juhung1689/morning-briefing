export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.FINNHUB_KEY;

  // 개별 주식은 Finnhub
  const stockSymbols = [
    { symbol: 'AAPL', name: '애플',     ticker: 'AAPL' },
    { symbol: 'NVDA', name: '엔비디아', ticker: 'NVDA' },
    { symbol: 'TSLA', name: '테슬라',   ticker: 'TSLA' },
  ];

  const fetchFinnhub = async (symbol) => {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
    return r.json();
  };

  // 지수는 stooq.com (무료, 키 불필요, CSV 반환)
  const fetchIndex = async (symbol, name, ticker) => {
    try {
      const r = await fetch(`https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const text = await r.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('no data');
      const cols = lines[1].split(',');
      // Symbol,Date,Time,Open,High,Low,Close,Volume
      const close = parseFloat(cols[6]);
      const open  = parseFloat(cols[3]);
      const changePct = open > 0 ? ((close - open) / open * 100) : 0;
      return {
        name, ticker,
        price: close.toLocaleString('en-US', { maximumFractionDigits: 2 }),
        changePct,
        change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
        direction: changePct >= 0 ? 'up' : 'down'
      };
    } catch(e) {
      return { name, ticker, price: '-', changePct: 0, change: '-', direction: 'up' };
    }
  };

  try {
    const [spData, nqData, djData, ...stockData] = await Promise.all([
      fetchIndex('^spx', 'S&P 500',  'SPX'),
      fetchIndex('^ndq', '나스닥',    'COMP'),
      fetchIndex('^dji', '다우존스',  'DJI'),
      ...stockSymbols.map(s => fetchFinnhub(s.symbol).then(d => {
        const price = d.c || 0;
        const prev  = d.pc || 0;
        const changePct = prev > 0 ? ((price - prev) / prev * 100) : 0;
        return {
          name: s.name, ticker: s.ticker,
          price: `$${price.toFixed(2)}`,
          changePct,
          change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
          direction: changePct >= 0 ? 'up' : 'down'
        };
      }))
    ]);

    const indices = [spData, nqData, djData];
    const allUp = indices.every(i => i.changePct > 0);
    const allDn = indices.every(i => i.changePct < 0);
    const trend = allUp ? '전반적으로 강세로 마감했습니다.' :
                  allDn ? '전반적으로 약세로 마감했습니다.' : '혼조세로 마감했습니다.';

    const summary = `S&P500 ${spData.change}, 나스닥 ${nqData.change}, 다우 ${djData.change}. ${trend}`;

    res.status(200).json({ indices, stocks: stockData, summary });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
