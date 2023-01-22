import {
  ATOM_DENOM,
  USK_DENOM,
  BID_MAX,
  BID_MIN_USK,
  RATELIMIT_SEC,
  FIN_ATOM_USK_CONTRACT,
  BOW_ATOM_USK_CONTRACT,
  DENOM_AMOUNT
} from './config';
import './kujira_bot';
import { botClientFactory } from './kujira_bot';
import Decimal from 'decimal.js';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const bot = botClientFactory();
bot.then(function (b) {
  (async () => {
    while (true) {
      // 入札の確認
      console.log('[CHECK] start');
      console.log('[GET] bids');
      const bids = await b.getBids();
      // 入札の注文数が最大に達していないなら新規入札を発行
      console.log('[CHECK] bids length < BID_MAX');
      if (bids.length < BID_MAX) {
        console.log('[GET] uskBalance');
        const uskBalance = new Decimal(await b.getTokenBalance(USK_DENOM))
          .minus(0.1)
          .toNumber();
        // USKの残高がBID_MIN_USKを上回るなら新規入札の発行を継続
        console.log('[CHECK] uskBalance > BID_MIN_USK');
        if (uskBalance > BID_MIN_USK) {
          console.log('[GET] premiumWithPriceImpact');
          const premiumWithPriceImpact = await b.getPremiumWithPriceImpact({
            contract: BOW_ATOM_USK_CONTRACT,
            uskBalance
          });
          // premiumWithPriceImpactの確認・詳しくはgetPremiumWithPriceImpactを参照
          console.log('[CHECK] premiumWithPriceImpact !=0');
          if (premiumWithPriceImpact != 0) {
            // TODO: 他の清算者から入札の設定を取得して、PremiumとAmountを推定後にpremiumWithPriceImpactを調整する
            console.log('[DO] submitBid');
            await b.submitBid(premiumWithPriceImpact, uskBalance);
          }
        }
      }

      // TODO: プライスインパクトの確認から入札を自動でキャンセルできるようにする
      for (let i of bids) {
        const pairs = await b.getPairs(BOW_ATOM_USK_CONTRACT);
        const priceImpact = await b.getPriceImpact(
          pairs[0],
          pairs[1],
          new Decimal(i['amount']).div(DENOM_AMOUNT).toNumber(),
          'cosmos'
        );
        // 入札のプレミアムよりpriceImpactが大きい場合は入札をキャンセル
        console.log('[CHECK] bid premium < priceImpact');
        if (i['premium_slot'] < priceImpact) {
          console.log('[DO] retractBid');
          await b.retractBid(i['idx']);
          bids.splice(bids.indexOf(i, 0));
        }
      }

      // 清算済み入札の確認
      let bidsIdxs = [];
      let premiumAvg = 0;
      // 入札の平均プレミアム確認
      console.log('[GET] bidsIdxs & premiumAvg');
      for (let i of bids) {
        if (parseFloat(i['pending_liquidated_collateral']) > 0) {
          bidsIdxs.push(i['idx']);
          premiumAvg += parseInt(i['premium']);
        }
      }

      console.log('[CHECK] bidsIdxs length > 0');
      if (bidsIdxs.length > 0) {
        await b.claimLiquidations(bidsIdxs);
        console.log('[GET] atomBalance');
        const atomBalance = await b.getTokenBalance(ATOM_DENOM);
        // プライスインパクトの確認
        console.log('[GET] pairs');
        const pairs = await b.getPairs(BOW_ATOM_USK_CONTRACT);
        console.log('[GET] priceImpact');
        const priceImpact = await b.getPriceImpact(
          pairs[0],
          pairs[1],
          atomBalance,
          'cosmos'
        );
        console.log('[CHECK] priceImapct < premiumAvg');
        if (priceImpact < premiumAvg) {
          // 清算したATOMをUSKにスワップ
          console.log('[DO] swap');
          await b.swap(atomBalance, FIN_ATOM_USK_CONTRACT, ATOM_DENOM);
        } else {
          // TODO: アラートの追加
        }
      }
      await delay(RATELIMIT_SEC * 1000);
      console.log('');
    }
  })();
});
