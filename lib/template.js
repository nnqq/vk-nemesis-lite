const v = require('./validate');

function xs(strings, ...expressions) {
  const indent = new RegExp(`\n {${strings[0].match(/\n+( *)/)[1].length}}`, 'g');
  return expressions.reduce(
    (acc, expr, i) => `${acc}${expr}${strings[i + 1].replace(indent, '\n')}`,
    strings[0].replace(indent, '\n'),
  ).replace(/^\n|\n$/g, '');
}

class template {
  static reportItem(myPhoto, competitorPhoto) {
    return xs`
      Найден плагиат!
      
      Оригинал: https://vk.com/photo${myPhoto.owner_id}_${myPhoto.id}
      Дата размещения: ${v.unixToRuString(myPhoto.date)}
                
      Копия: https://vk.com/photo${competitorPhoto.owner_id}_${competitorPhoto.id}
      Дата размещения: ${v.unixToRuString(competitorPhoto.date)}
      `;
  }
}

module.exports = template;
