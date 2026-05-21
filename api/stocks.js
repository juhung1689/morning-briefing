export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = process.env.FINNHUB_KEY;

  // Finnhub 실제 지수 심볼
  // S&P500: ^GSPC, 나스닥종합: ^IXIC, 다우: ^DJI - Finnhub에선 OANDA prefix 필요없음
  // 무료플랜에서 지수는 지원 안될 수 있으므로 ETF fallback 포함
  const targets = [
    { primary: '^GSPC', fallback: 'SPY',  name: 'S&P 500',   ticker: 'S&P500', isIndex: true  },
    { primary: '^IXIC', fallback: 'QQQ',  name: '나스닥',     ticker: 'NASDAQ', isIndex: true  },
    { primary: '^DJI',  fallback: 'DIA',  name: '다우존스',   ticker: 'DOW',    isIndex: true  },
    { primary: 'AAPL',  fallback: null,   name: '애플',       ticker: 'AAPL',   isIndex: false },
    { primary: 'NVDA',  fallback: null,   name: '엔비디아',   ticker: 'NVDA',   isIndex: false },
    { primary: 'TSLA',  fallback: null,   name: '테슬라',     ticker: 'TSLA',   isIndex: false },
  ];

  const fetchQuote = async (symbol) => {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
    const d = await r.json();
    return d;
  };

  const formatResult = (d, meta) => {
    const price = d.c || 0;
    const prev  = d.pc || 0;
    const changePct = prev > 0 ? ((price - prev) / prev * 100) : 0;
    return {
      name: meta.name,
      ticker: meta.ticker,
      price: meta.isIndex
        ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
        : `$${price.toFixed(2)}`,
      changePct,
      change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      direction: changePct >= 0 ? 'up' : 'down'
    };
  };

  try {
    const results = await Promise.all(targets.map(async (t) => {
      let d = await fetchQuote(t.primary);
      // 지수 심볼이 0을 반환하면 fallback ETF 사용
      if ((!d.c || d.c === 0) && t.fallback) {
        d = await fetchQuote(t.fallback);
      }
      return formatResult(d, t);
    }));

    const [sp, nq, dj] = results;
    const allUp = sp.changePct > 0 && nq.changePct > 0 && dj.changePct > 0;
    const allDn = sp.changePct < 0 && nq.changePct < 0 && dj.changePct < 0;
    const trend = allUp ? '전반적으로 강세로 마감했습니다.' :
                  allDn ? '전반적으로 약세로 마감했습니다.' : '혼조세로 마감했습니다.';

    const summary = `S&P500 ${sp.change}, 나스닥 ${nq.change}, 다우 ${dj.change}. ${trend}`;

    res.status(200).json({ indices: results.slice(0,3), stocks: results.slice(3), summary });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
