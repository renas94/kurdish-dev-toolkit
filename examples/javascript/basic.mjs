// Run after `npm run build` at the repository root:  node examples/javascript/basic.mjs
import {
  createTranslator,
  englishMessages,
  explainNormalization,
  formatCurrency,
  formatDate,
  formatNumber,
  getDirection,
  parseNumber,
  soraniMessages,
  splitByDirection,
} from '@kurdish-dev-toolkit/core';

// 1. Clean up user input from an Arabic keyboard, and see exactly what changed.
const report = explainNormalization('كتێبخانةى شار');
console.log(report.output, report.changes.map((c) => `${c.rule}: ${c.from}→${c.to}`));

// 2. Numbers: display in Kurdish digits, accept input in any digit system.
console.log(formatNumber(1234567.5));        // ١٬٢٣٤٬٥٦٧٫٥
console.log(parseNumber('۱٬۲۵۰'));            // 1250

// 3. Prices and dates.
console.log(formatCurrency(1250000));        // ١٬٢٥٠٬٠٠٠ د.ع
console.log(formatDate(new Date(), { timeZone: 'Asia/Baghdad', format: 'full' }));

// 4. Mixed-direction text.
console.log(getDirection('من React بەکاردێنم'));
console.log(splitByDirection('من React بەکاردێنم'));

// 5. Translations.
const t = createTranslator({ locale: 'ckb', fallbackLocale: 'en', messages: { ckb: soraniMessages, en: englishMessages } });
console.log(t('auth.welcome', { name: 'شیلان' }), t('messages.count', { count: 12 }));
