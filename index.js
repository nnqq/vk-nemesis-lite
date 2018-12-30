const Promise = require('bluebird');
const request = require('request-promise');
const { VK } = require('vk-io');
const compareImages = require('resemblejs/compareImages');
const logger = require('pino')();
const event = require('./lib/eventBus');
const config = require('./lib/config');
const template = require('./lib/template');
const v = require('./lib/validate');
const rotatingProxy = require('./lib/rotatingProxy');

const vk = new VK({
  token: process.env.VK_ACCESS_TOKEN,
  language: 'ru',
});

const prevImageOne = {
  url: null,
  buffer: null,
};

function getDiff(imageOneUrl, imageTwoUrl) {
  let firstRequest;

  if (imageOneUrl === prevImageOne.url) {
    firstRequest = Promise.resolve(prevImageOne.buffer);
  } else {
    firstRequest = request.get({
      url: imageOneUrl,
      encoding: null,
      proxy: rotatingProxy(),
      tunnel: false,
      followRedirect: true,
    });
  }

  return Promise.all([
    firstRequest,
    request.get({
      url: imageTwoUrl,
      encoding: null,
      proxy: rotatingProxy(),
      tunnel: false,
      followRedirect: true,
    }),
  ])
    .then((images) => {
      const [imageOne, imageTwo] = images;

      prevImageOne.url = imageOneUrl;
      prevImageOne.buffer = imageOne;

      return compareImages(
        imageOne,
        imageTwo,
        {
          scaleToSameSize: true,
          ignore: 'nothing',
        },
      );
    });
}

function getGroupPhotos(groupId) {
  return vk.api.photos.get({
    owner_id: -groupId,
    album_id: 'wall',
    rev: 1,
    count: 1000,
  })
    .then((first1000Photos) => {
      const totalPhotos = first1000Photos.count;

      if (totalPhotos > 1000) {
        const requests = [];

        for (let i = 1; i < Math.ceil(totalPhotos / 1000); i += 1) {
          requests.push(vk.api.photos.get({
            owner_id: -groupId,
            album_id: 'wall',
            rev: 1,
            count: 1000,
            offset: i * 1000,
          }));
        }

        return Promise.all(requests)
          .then((restPhotos) => {
            const restPhotosItems = restPhotos.map(photos => photos.items);

            return first1000Photos.items.concat(restPhotosItems).reduce((acc, val) => acc
              .concat(val), []);
          });
      }

      return first1000Photos.items;
    });
}

function compareNewPhotos() {
  const photosMaxAge = Date.now() / 1000 - config.competitorPhotosMaxAge;

  return Promise.all([
    vk.api.groups.search({
      q: config.searchQuery,
      count: config.maxGroupsCount,
      sort: 0,
    }),
    getGroupPhotos(config.myGroupId),
  ])
    .then((data) => {
      const [competitorGroups, myGroupPhotos] = data;

      const competitorGroupsFiltered = competitorGroups.items.filter(group => !config.whiteList
        .includes(group.id) || !(group.id === config.myGroupId));

      return Promise.map(competitorGroupsFiltered,
        competitorGroup => getGroupPhotos(competitorGroup.id)
          .then(competitorPhotos => Promise.map(competitorPhotos,
            competitorPhoto => Promise.map(myGroupPhotos, (myPhoto) => {
              if (competitorPhoto.date > myPhoto.date
                && competitorPhoto.date > photosMaxAge) {
                const compPhotoUrl = competitorPhoto.sizes[0].url;
                const myPhotoUrl = myPhoto.sizes[0].url;

                return getDiff(compPhotoUrl, myPhotoUrl)
                  .then((compared) => {
                    if (compared.rawMisMatchPercentage < config.criticalPhotosMisMatch) {
                      const reportMsg = template.reportItem(myPhoto, competitorPhoto);
                      return v.splitAndSendMsg(vk, config, reportMsg);
                    }
                  });
              }
            }, {
              concurrency: config.photosConcurrency,
            }), {
              concurrency: config.photosConcurrency,
            }))
          .catch((e) => {
            if (e.code !== 200 && e.name !== 'APIError') logger.info(e);
          }), {
          concurrency: config.groupsConcurrency,
        })
        .catch((e) => {
          logger.info(e);
        })
        .finally(() => {
          event.emit('compare finished');
        });
    });
}

if (config.useProxy) {
  event.once('proxy ready', () => {
    compareNewPhotos();
  });
} else {
  compareNewPhotos();
}

event.on('compare finished', () => {
  compareNewPhotos();
});
