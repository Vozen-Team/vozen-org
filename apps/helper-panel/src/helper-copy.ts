import romance from './helper-app-pt-fr-es.json';
import germanTurkish from './helper-app-de-tr.json';
import arabicChinese from './helper-app-ar-zh.json';
import russianKorean from './helper-app-ru-ko.json';
import components from './helper-components-copy.json';
import schema from './helper-schema-copy.json';
import dependencies from './helper-dependency-copy.json';
import shared from './helper-shared-copy.json';
import presentation from './helper-presentation-copy.json';

// Source copy avoids sharing a field translation between unrelated feature settings.
export const helperCopy: Record<string, Record<string, string>> = {};
for (const catalogue of [romance, germanTurkish, arabicChinese, russianKorean, components, schema, dependencies, presentation, shared]) {
  for (const [source, translations] of Object.entries(catalogue)) {
    helperCopy[source] = { ...helperCopy[source], ...translations };
  }
}
