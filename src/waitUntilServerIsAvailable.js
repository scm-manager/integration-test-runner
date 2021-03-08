const logger = require("./logger");
const axios = require("axios");

const waitUntilServerIsAvailable = url => {
  return new Promise((resolve, reject) => {
    checkServerIsAvailable(url, resolve, reject);
  });
};

const checkServerIsAvailable = (url, resolve, reject, counter = 0) => {
  serverAvailable(url).then(available => {
    if (available) {
      logger.info("Server available.");
      resolve();
    } else if (counter >= 180) {
      logger.error("Server could not be reached.");
      reject();
    } else {
      logger.debug("Server not reachable. Try again in 1 second.");
      setTimeout(() => {
        checkServerIsAvailable(url, resolve, reject, ++counter);
      }, 1000);
    }
  });
};

const serverAvailable = async url => {
  try {
    let res = await axios({
      url: `${url}/api/v2/`,
      method: "get",
      timeout: 5000,
      headers: {
        "Content-Type": "application/json"
      }
    });
    return res.status === 200;
  } catch (err) {
    return false;
  }
};

module.exports = waitUntilServerIsAvailable;
