const axios = require('axios');
const cheerio = require('cheerio');

const URL = 'https://gold.tanaka.co.jp/commodity/souba/index.php';

// tr クラス → 金属キーのマッピング（テキスト一致より確実）
const ROW_CLASS_MAP = {
  gold:      'gold',
  platinum:  'pt',
  silver:    'silver',
  palladium: 'palladium',
};

// 田中貴金属の価格ページをスクレイピングして各金属の価格を返す
// 対象テーブル: #metal_price（列構成: 金属名, 小売, 前日比, 買取, 前日比, リンク）
async function scrapeTanaka() {
  const { data: html } = await axios.get(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 8000,
  });

  const $ = cheerio.load(html);
  const result = {};

  const parsePrice = (cell) => {
    const text = $(cell).text().replace(/,/g, '').trim();
    const num = parseFloat(text);
    return isNaN(num) ? null : num;
  };

  // #metal_price テーブルの各行をクラスで金属を判定
  $('#metal_price tr').each((_, row) => {
    const rowClass = $(row).attr('class') || '';

    let metalKey = null;
    for (const [key, cls] of Object.entries(ROW_CLASS_MAP)) {
      if (rowClass === cls) {
        metalKey = key;
        break;
      }
    }
    if (!metalKey) return;

    const cells = $(row).find('td');
    if (cells.length < 4) return;

    result[metalKey] = {
      retail: parsePrice(cells[1]),
      buying: parsePrice(cells[3]),  // cells[2]は前日比のため1つ飛ばす
    };
  });

  return result;
}

module.exports = { scrapeTanaka };
