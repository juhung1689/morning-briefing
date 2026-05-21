export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Yahoo Finance v8 - 전일 종가 기준으로 계산
  const symbols = ['^GSPC', '^IXIC', '^DJI', 'AAPL', 'NVDA', 'TSLA'];
  const names = {
    '^GSPC': 'S&P 500', '^IXIC': '나스닥', '^DJI': '다우존스',
    'AAPL': '애플', 'NVDA': '엔비디아', 'TSLA': '테슬라'
  };

  try {
    // crumb 없이 직접 호출 가능한 엔드포인트
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=regularMarketPrice,regularMarketPreviousClose,regularMarketChange,regularMarketChangePercent,marketState`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!r.ok) throw new Error(`Yahoo API ${r.status}`);
    const data = await r.json();
    const quotes = data.quoteResponse?.result || [];
    if (!quotes.length) throw new Error('No quotes returned');

    const result = quotes.map(q => {
      const price = q.regularMarketPrice || 0;
      const prevClose = q.regularMarketPreviousClose || 0;
      const isIndex = q.symbol.startsWith('^');

      // 전일 종가 대비 직접 계산 (API 변화율이 0일 때도 정확)
      const changePct = prevClose > 0 ? ((price - prevClose) / prevClose * 100) : 0;

      return {
        name: names[q.symbol] || q.symbol,
        ticker: q.symbol.replace('^', ''),
        price: isIndex
          ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : `$${price.toFixed(2)}`,
        prevClose: prevClose,
        change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
        direction: changePct >= 0 ? 'up' : 'down'
      };
    });

    const sp = result.find(r => r.name === 'S&P 500');
    const nq = result.find(r => r.name === '나스닥');
    const dj = result.find(r => r.name === '다우존스');

    const spPct = sp ? parseFloat(sp.change) : 0;
    const nqPct = nq ? parseFloat(nq.change) : 0;
    const djPct = dj ? parseFloat(dj.change) : 0;

    const allUp = spPct > 0 && nqPct > 0 && djPct > 0;
    const allDn = spPct < 0 && nqPct < 0 && djPct < 0;
    const trend = allUp ? '전반적으로 강세 흐름으로 마감했습니다.' :
                  allDn ? '전반적으로 약세 흐름으로 마감했습니다.' :
                  '혼조세로 마감했습니다.';

    const summary = `S&P500 ${sp?.change || '-'}, 나스닥 ${nq?.change || '-'}, 다우 ${dj?.change || '-'}. ${trend}`;

    res.status(200).json({
      indices: result.slice(0, 3),
      stocks: result.slice(3),
      summary
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
