const axios = require('axios');

module.exports.getStreamFromURL = async (url) => {
    const response = await axios.get(url, { responseType: 'stream' });
    return response.data;
};