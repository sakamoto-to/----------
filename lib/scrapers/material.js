const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const URL = 'https://www.material.co.jp/cgi-bin/market/data.cgi';

const METAL_KEYS = {
  gold:      '金',
  platinum:  'プラチナ',
  silver:    '銀',
  palladium: 'パラジウム',
};

// 日本マテリアルの価格ページをスクレイピングして各金属の価格を返す
// サイトは EUC-JP エンコーディングのため iconv-lite で UTF-8 に変換して処理
// 対象テーブル: table.pc_table（金属名は<th.material>、価格は.p_number span）
async function scrapeMaterial() {
  const { data: buffer } = await axios.get(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    responseType: 'arraybuffer',  // EUC-JPのまま受け取る
    timeout: 8000,
  });

  // EUC-JP → UTF-8 に変換
  const html = iconv.decode(Buffer.from(buffer), 'euc-jp');

  const $ = cheerio.load(html);
  const result = {};

  $('table.pc_table tr').each((_, row) => {
    // 金属名は th.material クラスの要素にある
    const metalText = $(row).find('th.material').text().trim();
    if (!metalText) return;

    let metalKey = null;
    for (const [key, name] of Object.entries(METAL_KEYS)) {
      if (metalText.includes(name)) {
        metalKey = key;
        break;
      }
    }
    if (!metalKey) return;

    // 行内の .p_number スパンから [小売価格, 買取価格] を取得
    const prices = $(row).find('.p_number').map((_, el) => {
      const num = parseFloat($(el).text().replace(/,/g, '').trim());
      return isNaN(num) ? null : num;
    }).get();

    result[metalKey] = {
      retail: prices[0] ?? null,
      buying: prices[1] ?? null,
    };
  });

  return result;
}

module.exports = { scrapeMaterial };
