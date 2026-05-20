export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const symbols = ['^GSPC', '^IXIC', '^DJI', 'AAPL', 'NVDA', 'TSLA'];
  const names = {
    '^GSPC': 'S&P 500', '^IXIC': '나스닥', '^DJI': '다우존스',
    'AAPL': '애플', 'NVDA': '엔비디아', 'TSLA': '테슬라'
  };

  try {
    const q2url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`;
    const r2 = await fetch(q2url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data2 = await r2.json();
    const quotes = data2.quoteResponse?.result || [];

    const result = quotes.map(q => {
      // 장 마감 후면 regularMarket, 장 중이면 전일 대비로 표시
      const change = q.regularMarketChangePercent || 0;
      const prevChange = q.regularMarketChange || 0;
      const price = q.regularMarketPrice || 0;
      const prevClose = q.regularMarketPreviousClose || 0;
      const isIndex = q.symbol.startsWith('^');

      // 변화율이 0이면 전일 종가 대비로 재계산
      const effectiveChange = (change === 0 && prevClose > 0)
        ? ((price - prevClose) / prevClose * 100)
        : change;

      return {
        name: names[q.symbol] || q.symbol,
        ticker: q.symbol.replace('^', ''),
        price: isIndex
          ? price.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : `$${price.toFixed(2)}`,
        prevClose: isIndex
          ? prevClose.toLocaleString('en-US', { maximumFractionDigits: 0 })
          : `$${prevClose.toFixed(2)}`,
        change: `${effectiveChange >= 0 ? '+' : ''}${effectiveChange.toFixed(2)}%`,
        direction: effectiveChange >= 0 ? 'up' : 'down',
        marketState: q.marketState || 'CLOSED'
      };
    });

    const spQ = quotes.find(q => q.symbol === '^GSPC');
    const nqQ = quotes.find(q => q.symbol === '^IXIC');
    const djQ = quotes.find(q => q.symbol === '^DJI');

    const spChange = spQ ? ((spQ.regularMarketChangePercent === 0 && spQ.regularMarketPreviousClose)
      ? (spQ.regularMarketPrice - spQ.regularMarketPreviousClose) / spQ.regularMarketPreviousClose * 100
      : spQ.regularMarketChangePercent) : 0;
    const nqChange = nqQ ? ((nqQ.regularMarketChangePercent === 0 && nqQ.regularMarketPreviousClose)
      ? (nqQ.regularMarketPrice - nqQ.regularMarketPreviousClose) / nqQ.regularMarketPreviousClose * 100
      : nqQ.regularMarketChangePercent) : 0;
    const djChange = djQ ? ((djQ.regularMarketChangePercent === 0 && djQ.regularMarketPreviousClose)
      ? (djQ.regularMarketPrice - djQ.regularMarketPreviousClose) / djQ.regularMarketPreviousClose * 100
      : djQ.regularMarketChangePercent) : 0;

    const marketState = spQ?.marketState || 'CLOSED';
    const stateLabel = marketState === 'REGULAR' ? '장 중' : '전일 마감';

    const allUp = spChange > 0 && nqChange > 0 && djChange > 0;
    const allDown = spChange < 0 && nqChange < 0 && djChange < 0;
    const trend = allUp ? '전반적으로 강세 흐름을 보였습니다.' : allDown ? '전반적으로 약세 흐름을 보였습니다.' : '혼조세로 마감했습니다.';

    const summary = `[${stateLabel}] S&P500 ${spChange >= 0 ? '+' : ''}${spChange.toFixed(2)}%, 나스닥 ${nqChange >= 0 ? '+' : ''}${nqChange.toFixed(2)}%, 다우 ${djChange >= 0 ? '+' : ''}${djChange.toFixed(2)}%. ${trend}`;

    res.status(200).json({ indices: result.slice(0, 3), stocks: result.slice(3), summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
