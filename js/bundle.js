/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/jwt-decode/build/jwt-decode.esm.js":
/*!*********************************************************!*\
  !*** ./node_modules/jwt-decode/build/jwt-decode.esm.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"InvalidTokenError\": () => (/* binding */ n),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__)\n/* harmony export */ });\nfunction e(e){this.message=e}e.prototype=new Error,e.prototype.name=\"InvalidCharacterError\";var r=\"undefined\"!=typeof window&&window.atob&&window.atob.bind(window)||function(r){var t=String(r).replace(/=+$/,\"\");if(t.length%4==1)throw new e(\"'atob' failed: The string to be decoded is not correctly encoded.\");for(var n,o,a=0,i=0,c=\"\";o=t.charAt(i++);~o&&(n=a%4?64*n+o:o,a++%4)?c+=String.fromCharCode(255&n>>(-2*a&6)):0)o=\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\".indexOf(o);return c};function t(e){var t=e.replace(/-/g,\"+\").replace(/_/g,\"/\");switch(t.length%4){case 0:break;case 2:t+=\"==\";break;case 3:t+=\"=\";break;default:throw\"Illegal base64url string!\"}try{return function(e){return decodeURIComponent(r(e).replace(/(.)/g,(function(e,r){var t=r.charCodeAt(0).toString(16).toUpperCase();return t.length<2&&(t=\"0\"+t),\"%\"+t})))}(t)}catch(e){return r(t)}}function n(e){this.message=e}function o(e,r){if(\"string\"!=typeof e)throw new n(\"Invalid token specified\");var o=!0===(r=r||{}).header?0:1;try{return JSON.parse(t(e.split(\".\")[o]))}catch(e){throw new n(\"Invalid token specified: \"+e.message)}}n.prototype=new Error,n.prototype.name=\"InvalidTokenError\";/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (o);\n//# sourceMappingURL=jwt-decode.esm.js.map\n\n\n//# sourceURL=webpack:///./node_modules/jwt-decode/build/jwt-decode.esm.js?");

/***/ }),

/***/ "./test.js":
/*!*****************!*\
  !*** ./test.js ***!
  \*****************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _token__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./token */ \"./token.js\");\n\n\n\n\nasync function test() {\n    let tokens = (0,_token__WEBPACK_IMPORTED_MODULE_0__.loadTokens)();\n    if (!(0,_token__WEBPACK_IMPORTED_MODULE_0__.checkToken)(tokens.id)) {\n        tokens = await (0,_token__WEBPACK_IMPORTED_MODULE_0__.refresh_tokens)(tokens.refresh);\n        console.log(\"refreshed\");\n    }\n}\n\ntest();\n\n//# sourceURL=webpack:///./test.js?");

/***/ }),

/***/ "./token.js":
/*!******************!*\
  !*** ./token.js ***!
  \******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"checkToken\": () => (/* binding */ checkToken),\n/* harmony export */   \"loadTokens\": () => (/* binding */ loadTokens),\n/* harmony export */   \"login\": () => (/* binding */ login),\n/* harmony export */   \"refresh_tokens\": () => (/* binding */ refresh_tokens),\n/* harmony export */   \"save_tokens\": () => (/* binding */ save_tokens)\n/* harmony export */ });\n/* harmony import */ var jwt_decode__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! jwt-decode */ \"./node_modules/jwt-decode/build/jwt-decode.esm.js\");\n\nconst authURL = \"https://message-journal.auth.us-west-2.amazoncognito.com\";\nconst redirectURI = window.location.origin + \"/callback.html\";\nconst clientID = \"2ji6bjoqm4p37s1r87t1099n0a\";\n\nfunction loadTokens() {\n    return {\n        id: window.localStorage.getItem(\"id_token\"),\n        access: window.localStorage.getItem(\"access_token\"),\n        refresh: window.localStorage.getItem(\"refresh_token\")\n    };\n}\n\nfunction checkToken(token) {\n    let decoded;\n    // attempt to decode\n    try {\n        decoded = (0,jwt_decode__WEBPACK_IMPORTED_MODULE_0__[\"default\"])(token);\n    } catch {\n        return false;\n    }\n\n    // check token expiration\n    if (decoded.exp < Date.now() / 1000) {\n        return false;\n    }\n\n    return true;\n}\n\nasync function refresh_tokens(refresh_token) {\n    if (!checkToken(refresh_token)) {\n        login();\n    }\n\n    return fetch(authURL + \"/oauth2/token\", {\n        method: \"POST\",\n        headers: {\n            \"Content-Type\": \"application/x-www-form-urlencoded\"\n        },\n        body: new URLSearchParams({\n            grant_type: \"refresh_token\",\n            client_id: clientID,\n            redirect_uri: redirectURI,\n            refresh_token: refresh_token\n        })\n    })\n    .then(response => response.json())\n    .then(data => save_tokens(data));\n}\n\nfunction save_tokens(data) {\n    console.log(data);\n    // save tokens to local storage\n    window.localStorage.setItem(\"id_token\", data.id_token);\n    window.localStorage.setItem(\"access_token\", data.access_token);\n    if (data.refresh_token) {\n        window.localStorage.setItem(\"refresh_token\", data.refresh_token);\n    } else {\n        data.refresh_token = window.localStorage.getItem(\"refresh_token\");\n    }\n    // return formatted tokens\n    return {\n        id: data.id_token,\n        access: data.access_token,\n        refresh: data.refresh_token\n    };\n}\n\nfunction login() {\n    // redirect to cognito hosted UI login\n    let url = new URL(authURL + \"/login\");\n    let params = new URLSearchParams({\n        redirect_uri: redirectURI,\n        client_id: clientID,\n        response_type: \"code\"\n    });\n    url.search = params.toString();\n    window.location.href = url.toString();\n\n}\n\n//# sourceURL=webpack:///./token.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./test.js");
/******/ 	
/******/ })()
;