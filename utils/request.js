var axios = require("axios");

exports.request = {
    get(uri, params, opts) {
        return axios.get(uri, {
            params: params,
        })
        // // lazy require
        // const request = require('request-promise-native')
        // const reqOpts = {
        //     method: 'GET',
        //     timeout: 30000,
        //     // resolveWithFullResponse: true,
        //     // json: true,
        //     uri,
        //     ...opts
        // }

        // return request(reqOpts)
    }
}
