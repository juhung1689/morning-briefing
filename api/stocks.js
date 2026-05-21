export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.FINNHUB_KEY;
  const symbols = [
    { symbol: 'SPY',  name: 'S&P 500',  ticker: 'SPY' },
    { symbol: 'QQQ',  name: '나스닥',    ticker: 'QQQ' },
    { symbol: 'DIA',  name: '다우존스',  ticker: 'DIA' },
    { symbol: 'AAPL', name: '애플',      ticker: 'AAPL' },
    { symbol: 'NVDA', name: '엔비디아',  ticker: 'NVDA' },
    { symbol: 'TSLA', name: '테슬라',    ticker: 'TSLA' },
  ];

  try {
    const results = await Promise.all(symbols.map(async s => {
      const r = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${s.symbol}&token=${key}`
      );
      const d = await r.json();
      // d.c = 현재가, d.pc = 전일종가
      const price = d.c || 0;
      const prev  = d.pc || 0;
      const changePct = prev > 0 ? ((price - prev) / prev * 100) : 0;
      return {
        name: s.name,
        ticker: s.ticker,
        price: `$${price.toFixed(2)}`,
        change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
        direction: changePct >= 0 ? 'up' : 'down'
      };
    }));

    const sp = results[0], nq = results[1], dj = results[2];
    const spPct = parseFloat(sp.change);
    const nqPct = parseFloat(nq.change);
    const djPct = parseFloat(dj.change);
    const allUp = spPct > 0 && nqPct > 0 && djPct > 0;
    const allDn = spPct < 0 && nqPct < 0 && djPct < 0;
    const trend = allUp ? '전반적으로 강세 흐름으로 마감했습니다.' :
                  allDn ? '전반적으로 약세 흐름으로 마감했습니다.' :
                  '혼조세로 마감했습니다.';

    const summary = `S&P500(SPY) ${sp.change}, 나스닥(QQQ) ${nq.change}, 다우(DIA) ${dj.change}. ${trend}`;

    res.status(200).json({
      indices: results.slice(0, 3),
      stocks: results.slice(3),
      summary
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
