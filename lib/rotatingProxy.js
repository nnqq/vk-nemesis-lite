const request = require('request-promise');
const Promise = require('bluebird');
const logger = require('pino')();
const event = require('./eventBus');
const config = require('./config');

const proxyList = {};

const apiParameter = process.env.PROXY_TOKEN ? `&api=${process.env.PROXY_TOKEN}` : '';

const loadProxiesRequest = Array(config.proxiesPoolSize / 20).fill(request.get({
  url: `http://pubproxy.com/api/proxy?limit=20&type=socks5&country=RU${apiParameter}`,
}));

function loadMoreProxies(requests) {
  return Promise.mapSeries(requests, (proxiesChunk) => {
    JSON.parse(proxiesChunk).data.forEach((proxyData) => {
      const proxyItem = `http://${proxyData.ipPort}`;
      if (!proxyList[proxyItem]) proxyList[proxyItem] = 0;
    });
  });
}

function rotatingProxy() {
  if (!config.useProxy) return false;

  for (const proxyItem in proxyList) {
    if (proxyList[proxyItem] < config.proxyReqSecLimit) {
      proxyList[proxyItem] += 1;
      return proxyList[proxyItem];
    }
  }

  throw new Error('Прокси не справляются. Возможные решения: уменьшить groupsConcurrency / '
    + 'photosConcurrency; увеличить proxiesPoolSize; увеличить reqSecLimit (рекомендуется не '
    + 'более 3)');
}

if (config.useProxy) {
  loadMoreProxies(loadProxiesRequest)
    .then(() => {
      setInterval(() => {
        Promise.map(Object.keys(proxyList), proxyItem => request.get({
          url: 'https://pp.userapi.com/c9591/u00001/136592355/s_47267f71.jpg',
          proxy: proxyItem,
          tunnel: false,
          followRedirect: true,
        })
          .then(() => {
            proxyList[proxyItem] += 1;
          })
          .catch(() => {
            delete proxyList[proxyItem];
          }))
          .then(() => {
            event.emit('proxy ready');
          });
      }, 5000);

      setInterval(() => {
        let totalProxies = 0;
        let activeProxies = 0;

        Object.keys(proxyList).forEach((proxyItem) => {
          if (proxyList[proxyItem] > 0) proxyList[proxyItem] -= 1;
          if (proxyList[proxyItem] < config.proxyReqSecLimit) activeProxies += 1;
          totalProxies += 1;
        });

        if (activeProxies / totalProxies < 0.5 || totalProxies < config.proxiesPoolSize) {
          loadMoreProxies(loadProxiesRequest);
        }
      }, 1000);
    })
    .catch((e) => {
      logger.info(e);
    });
}

module.exports = rotatingProxy;
