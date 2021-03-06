/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {assertHttpsUrl} from '../../../src/url';
import {dev, user} from '../../../src/log';
import {timer} from '../../../src/timer';
import {xhrFor} from '../../../src/xhr';

/** @const {string} */
const TAG = 'amp-access-client';

/** @const {number} */
const AUTHORIZATION_TIMEOUT = 3000;


/** @implements {AccessTypeAdapterDef} */
export class AccessClientAdapter {

  /**
   * @param {!Window} win
   * @param {!JSONObject} configJson
   * @param {!AccessTypeAdapterContextDef} context
   */
  constructor(win, configJson, context) {
    /** @const {!Window} */
    this.win = win;

    /** @const @private {!AccessTypeAdapterContextDef} */
    this.context_ = context;

    /** @const @private {string} */
    this.authorizationUrl_ = user.assert(configJson['authorization'],
        '"authorization" URL must be specified');
    assertHttpsUrl(this.authorizationUrl_, '"authorization"');

    /** @const @private {string} */
    this.pingbackUrl_ = user.assert(configJson['pingback'],
        '"pingback" URL must be specified');
    assertHttpsUrl(this.pingbackUrl_, '"pingback"');

    /** @const @private {!Xhr} */
    this.xhr_ = xhrFor(win);

    /** @const @private {!Timer} */
    this.timer_ = timer;
  }

  /** @override */
  getConfig() {
    return {
      'authorizationUrl': this.authorizationUrl_,
      'pingbackUrl': this.pingbackUrl_,
    };
  }

  /** @override */
  isAuthorizationEnabled() {
    return true;
  }

  /** @override */
  authorize() {
    dev.fine(TAG, 'Start authorization via ', this.authorizationUrl_);
    const urlPromise = this.context_.buildUrl(this.authorizationUrl_,
        /* useAuthData */ false);
    return urlPromise.then(url => {
      dev.fine(TAG, 'Authorization URL: ', url);
      return this.timer_.timeoutPromise(
          AUTHORIZATION_TIMEOUT,
          this.xhr_.fetchJson(url, {
            credentials: 'include',
            requireAmpResponseSourceOrigin: true,
          }));
    });
  }

  /** @override */
  pingback() {
    const promise = this.context_.buildUrl(this.pingbackUrl_,
        /* useAuthData */ true);
    return promise.then(url => {
      dev.fine(TAG, 'Pingback URL: ', url);
      return this.xhr_.sendSignal(url, {
        method: 'POST',
        credentials: 'include',
        requireAmpResponseSourceOrigin: true,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: '',
      });
    });
  }
}
