const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://www.tokuriki-kanda.co.jp/goldetc/market/';

// 列の順序: 金, プラチナ, 銀, パラジウム
const COLUMN_METALS = ['gold', 'platinum', 'silver', 'palladium'];

// 徳力本店の価格ページをスクレイピングして各金属の価格を返す
// 対象テーブル: table.table04（列=金属種、行=小売/買取）
async function scrapeTokuriki() {
  const { data: html } = await axios.get(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 8000,
  });

  const $ = cheerio.load(html);
  const result = {};

  const parsePrice = (text) => {
    const num = parseFloat(text.replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  };

  let retailRow = null;
  let buyingRow = null;

  // 「小売価格」と「買取価格」の行を探す
  $('table.table04 tr').each((_, row) => {
    const headerText = $(row).find('th').first().text().trim();
    if (headerText.includes('小売')) retailRow = row;
    if (headerText.includes('買取')) buyingRow = row;
  });

  // 小売価格行: tds が [金, プラチナ, 銀, パラジウム] の順
  if (retailRow) {
    $(retailRow).find('td').each((i, td) => {
      if (i >= COLUMN_METALS.length) return;
      if (!result[COLUMN_METALS[i]]) result[COLUMN_METALS[i]] = {};
      result[COLUMN_METALS[i]].retail = parsePrice($(td).text());
    });
  }

  // 買取価格行: 同順
  if (buyingRow) {
    $(buyingRow).find('td').each((i, td) => {
      if (i >= COLUMN_METALS.length) return;
      if (!result[COLUMN_METALS[i]]) result[COLUMN_METALS[i]] = {};
      result[COLUMN_METALS[i]].buying = parsePrice($(td).text());
    });
  }

  return result;
}

module.exports = { scrapeTokuriki };
